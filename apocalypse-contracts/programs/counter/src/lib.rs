use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::anchor::{commit, delegate, ephemeral};
use ephemeral_rollups_sdk::cpi::DelegateConfig;
use ephemeral_rollups_sdk::ephem::commit_and_undelegate_accounts;
use session_keys::{session_auth_or, Session, SessionError, SessionToken};

declare_id!("DcYYaAGLiY8BUMHeV9dziCdmJGgQCx3nUtiUyDG4jce4");

// ============================================================
// Seed constants
// ============================================================
pub const PROFILE_SEED: &[u8] = b"profile";
pub const BATTLE_SEED: &[u8] = b"battle";

#[ephemeral]
#[program]
pub mod counter {
    use super::*;

    // ============================================================
    // PROFILE / SINGLE-PLAYER
    // ============================================================

    /// Initialize a player profile.
    /// Called once per wallet on the base layer. Sets points to 0.
    pub fn initialize_profile(ctx: Context<InitializeProfile>) -> Result<()> {
        let profile = &mut ctx.accounts.profile;
        profile.authority = ctx.accounts.authority.key();
        profile.points = 0;
        profile.game_active = false;
        msg!(
            "Profile {} initialized for authority {}",
            profile.key(),
            profile.authority
        );
        Ok(())
    }

    /// Delegate the player profile to the Ephemeral Rollup.
    /// Must be called on the base layer before `start_game`.
    pub fn delegate_game(ctx: Context<DelegateProfile>) -> Result<()> {
        ctx.accounts.delegate_pda(
            &ctx.accounts.payer,
            &[PROFILE_SEED, ctx.accounts.payer.key().as_ref()],
            DelegateConfig {
                validator: ctx.remaining_accounts.first().map(|acc| acc.key()),
                ..Default::default()
            },
        )?;
        Ok(())
    }

    /// Mark the game as active. Called on the Ephemeral Rollup after delegation.
    #[session_auth_or(
        ctx.accounts.profile.authority.key() == ctx.accounts.signer.key(),
        GameError::InvalidAuth
    )]
    pub fn start_game(ctx: Context<GameAction>) -> Result<()> {
        let profile = &mut ctx.accounts.profile;
        require!(!profile.game_active, GameError::GameAlreadyActive);
        profile.game_active = true;
        msg!("Game started for profile {}", profile.key());
        Ok(())
    }

    /// Kill a zombie in single-player mode — awards `reward` points.
    /// Runs in the Ephemeral Rollup with session-key support for low-latency, no-popup gameplay.
    #[session_auth_or(
        ctx.accounts.profile.authority.key() == ctx.accounts.signer.key(),
        GameError::InvalidAuth
    )]
    pub fn kill_zombie(ctx: Context<GameAction>, reward: u64) -> Result<()> {
        let profile = &mut ctx.accounts.profile;
        require!(profile.game_active, GameError::GameNotActive);
        profile.points = profile.points.checked_add(reward).unwrap_or(u64::MAX);
        msg!(
            "Zombie killed! Profile {} now has {} points",
            profile.key(),
            profile.points
        );
        Ok(())
    }

    /// End a single-player game session.
    /// Marks the game inactive. The player can then call `undelegate_game` to settle.
    #[session_auth_or(
        ctx.accounts.profile.authority.key() == ctx.accounts.signer.key(),
        GameError::InvalidAuth
    )]
    pub fn end_game(ctx: Context<GameAction>) -> Result<()> {
        let profile = &mut ctx.accounts.profile;
        require!(profile.game_active, GameError::GameNotActive);
        profile.game_active = false;
        msg!(
            "Game ended for profile {}. Final points: {}",
            profile.key(),
            profile.points
        );
        Ok(())
    }

    /// Commit & undelegate the player profile back to the base layer.
    /// Settles all earned points on-chain permanently.
    pub fn undelegate_game(ctx: Context<CommitProfile>) -> Result<()> {
        commit_and_undelegate_accounts(
            &ctx.accounts.payer,
            vec![&ctx.accounts.profile.to_account_info()],
            &ctx.accounts.magic_context,
            &ctx.accounts.magic_program,
        )?;
        Ok(())
    }

    // ============================================================
    // MULTIPLAYER BATTLE
    // ============================================================

    /// Create a shared battle account on the base layer.
    /// The `room_id` seed allows multiple concurrent rooms.
    pub fn create_battle_account(
        ctx: Context<CreateBattle>,
        room_id: u64,
        max_players: u8,
    ) -> Result<()> {
        let battle = &mut ctx.accounts.battle;
        battle.host = ctx.accounts.host.key();
        battle.room_id = room_id;
        battle.max_players = max_players;
        battle.player_count = 0;
        battle.total_zombie_kills = 0;
        battle.active = false;
        msg!(
            "Battle room {} created (max {} players). Account: {}",
            room_id,
            max_players,
            battle.key()
        );
        Ok(())
    }

    /// Delegate the battle account to the Ephemeral Rollup.
    /// Must be called by the host after `create_battle_account`.
    pub fn delegate_battle_account(ctx: Context<DelegateBattle>, room_id: u64) -> Result<()> {
        ctx.accounts.delegate_pda(
            &ctx.accounts.payer,
            &[BATTLE_SEED, &room_id.to_le_bytes()],
            DelegateConfig {
                validator: ctx.remaining_accounts.first().map(|acc| acc.key()),
                ..Default::default()
            },
        )?;
        Ok(())
    }

    /// Start the multiplayer battle. Called by the host on the Ephemeral Rollup.
    /// Players can join via socket subscriptions and kill zombies afterward.
    #[session_auth_or(
        ctx.accounts.signer.key() == ctx.accounts.battle.host,
        GameError::InvalidAuth
    )]
    pub fn start_multiplayer_battle(ctx: Context<BattleAction>) -> Result<()> {
        let battle = &mut ctx.accounts.battle;
        require!(!battle.active, GameError::GameAlreadyActive);
        battle.active = true;
        battle.player_count = battle.player_count.checked_add(1).unwrap_or(u8::MAX);
        msg!("Multiplayer battle {} started!", battle.room_id);
        Ok(())
    }

    /// Join an active battle room.
    /// Any player can join as long as max_players is not reached.
    /// Uses PlayerBattleAction so each player can use their OWN session key.
    #[session_auth_or(
        ctx.accounts.signer.key() != Pubkey::default(),
        GameError::InvalidAuth
    )]
    pub fn join_battle(ctx: Context<PlayerBattleAction>) -> Result<()> {
        let battle = &mut ctx.accounts.battle;
        require!(battle.active, GameError::GameNotActive);
        require!(
            battle.player_count < battle.max_players,
            GameError::BattleRoomFull
        );
        battle.player_count = battle.player_count.checked_add(1).unwrap_or(battle.max_players);
        msg!(
            "Player {} joined battle room {}. Players: {}/{}",
            ctx.accounts.signer.key(),
            battle.room_id,
            battle.player_count,
            battle.max_players
        );
        Ok(())
    }

    /// Kill a zombie in multiplayer mode.
    /// Any player in the room calls this via socket-coordinated transactions on the ER.
    /// Uses PlayerBattleAction so each player can use their OWN session key.
    #[session_auth_or(
        ctx.accounts.signer.key() != Pubkey::default(),
        GameError::InvalidAuth
    )]
    pub fn kill_zombie_battle(ctx: Context<PlayerBattleAction>, reward: u64) -> Result<()> {
        let battle = &mut ctx.accounts.battle;
        require!(battle.active, GameError::GameNotActive);
        battle.total_zombie_kills = battle.total_zombie_kills.checked_add(1).unwrap_or(u64::MAX);
        battle.total_points = battle.total_points.checked_add(reward).unwrap_or(u64::MAX);
        msg!(
            "Zombie killed in battle {}! Total kills: {}, Total points: {}",
            battle.room_id,
            battle.total_zombie_kills,
            battle.total_points
        );
        Ok(())
    }

    /// Step 1: End the multiplayer battle — sets active=false.
    /// Called by the host on the ER. Uses BattleAction so session key is supported.
    /// Must be called BEFORE `commit_battle`.
    #[session_auth_or(
        ctx.accounts.signer.key() == ctx.accounts.battle.host,
        GameError::InvalidAuth
    )]
    pub fn end_battle(ctx: Context<BattleAction>) -> Result<()> {
        let battle = &mut ctx.accounts.battle;
        require!(battle.active, GameError::GameNotActive);
        battle.active = false;
        msg!(
            "Battle {} ended. Final kills: {}, Final points: {}",
            battle.room_id,
            battle.total_zombie_kills,
            battle.total_points
        );
        Ok(())
    }

    /// Step 2: Commit the battle account state back to the base layer and undelegate.
    /// IMPORTANT: does NOT write to `battle` — state was already updated by `end_battle`.
    /// Keeping write and commit separate avoids the ER ownership-transfer conflict.
    pub fn commit_battle(ctx: Context<CommitBattle>) -> Result<()> {
        require!(
            ctx.accounts.payer.key() == ctx.accounts.battle.host
                || ctx.accounts.battle.player_count == 1,
            GameError::InvalidAuth
        );
        commit_and_undelegate_accounts(
            &ctx.accounts.payer,
            vec![&ctx.accounts.battle.to_account_info()],
            &ctx.accounts.magic_context,
            &ctx.accounts.magic_program,
        )?;
        Ok(())
    }
}

// ============================================================
// Account Contexts — Single Player
// ============================================================

#[derive(Accounts)]
pub struct InitializeProfile<'info> {
    #[account(
        init_if_needed,
        payer = authority,
        space = 8 + Profile::INIT_SPACE,
        seeds = [PROFILE_SEED, authority.key().as_ref()],
        bump
    )]
    pub profile: Account<'info, Profile>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

/// Context for delegating a Profile PDA to the ER
#[delegate]
#[derive(Accounts)]
pub struct DelegateProfile<'info> {
    pub payer: Signer<'info>,
    /// CHECK: Profile PDA to delegate — seeds validated
    #[account(mut, del, seeds = [PROFILE_SEED, payer.key().as_ref()], bump)]
    pub pda: AccountInfo<'info>,
}

/// Context for gameplay actions that update Profile (runs on ER)
#[derive(Accounts, Session)]
pub struct GameAction<'info> {
    #[account(
        mut,
        seeds = [PROFILE_SEED, profile.authority.key().as_ref()],
        bump
    )]
    pub profile: Account<'info, Profile>,

    #[account(mut)]
    pub signer: Signer<'info>,

    #[session(signer = signer, authority = profile.authority.key())]
    pub session_token: Option<Account<'info, SessionToken>>,
}

/// Context for committing / undelegating Profile back to base layer
#[commit]
#[derive(Accounts)]
pub struct CommitProfile<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        mut,
        seeds = [PROFILE_SEED, payer.key().as_ref()],
        bump
    )]
    pub profile: Account<'info, Profile>,
}

// ============================================================
// Account Contexts — Multiplayer Battle
// ============================================================

#[derive(Accounts)]
#[instruction(room_id: u64)]
pub struct CreateBattle<'info> {
    #[account(
        init,
        payer = host,
        space = 8 + Battle::INIT_SPACE,
        seeds = [BATTLE_SEED, &room_id.to_le_bytes()],
        bump
    )]
    pub battle: Account<'info, Battle>,

    #[account(mut)]
    pub host: Signer<'info>,

    pub system_program: Program<'info, System>,
}

/// Context for delegating a Battle PDA to ER
#[delegate]
#[derive(Accounts)]
#[instruction(room_id: u64)]
pub struct DelegateBattle<'info> {
    pub payer: Signer<'info>,
    /// CHECK: Battle PDA to delegate — seeds validated
    #[account(mut, del, seeds = [BATTLE_SEED, &room_id.to_le_bytes()], bump)]
    pub pda: AccountInfo<'info>,
}

/// Context for host-only battle actions (start_multiplayer_battle).
/// Session token authority = battle.host — only the host's session key is valid.
#[derive(Accounts, Session)]
pub struct BattleAction<'info> {
    #[account(
        mut,
        seeds = [BATTLE_SEED, &battle.room_id.to_le_bytes()],
        bump
    )]
    pub battle: Account<'info, Battle>,

    #[account(mut)]
    pub signer: Signer<'info>,

    /// Host's session token — authority must match battle.host.
    #[session(signer = signer, authority = battle.host.key())]
    pub session_token: Option<Account<'info, SessionToken>>,
}

/// Context for per-player battle actions (join_battle, kill_zombie_battle).
/// Each player passes their OWN wallet as `authority` so their own session key is accepted.
#[derive(Accounts, Session)]
pub struct PlayerBattleAction<'info> {
    #[account(
        mut,
        seeds = [BATTLE_SEED, &battle.room_id.to_le_bytes()],
        bump
    )]
    pub battle: Account<'info, Battle>,

    #[account(mut)]
    pub signer: Signer<'info>,

    /// The player's own wallet — used as the session token authority.
    /// CHECK: Only referenced for session authority validation.
    pub authority: UncheckedAccount<'info>,

    /// Player's session token (authority = player's wallet, not battle.host).
    #[session(signer = signer, authority = authority.key())]
    pub session_token: Option<Account<'info, SessionToken>>,
}

/// Context for ending battle and committing to base layer
#[commit]
#[derive(Accounts)]
#[instruction()]
pub struct CommitBattle<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        mut,
        seeds = [BATTLE_SEED, &battle.room_id.to_le_bytes()],
        bump
    )]
    pub battle: Account<'info, Battle>,
}

// ============================================================
// Account Data Structs
// ============================================================

#[account]
#[derive(InitSpace)]
pub struct Profile {
    /// The wallet that owns this profile
    pub authority: Pubkey,
    /// Accumulated zombie-kill points
    pub points: u64,
    /// Whether a game session is currently in progress
    pub game_active: bool,
}

#[account]
#[derive(InitSpace)]
pub struct Battle {
    /// The host who created and delegates this room
    pub host: Pubkey,
    /// Unique identifier for this battle room
    pub room_id: u64,
    /// Max number of players allowed
    pub max_players: u8,
    /// Current number of joined players
    pub player_count: u8,
    /// Total zombies killed across all players
    pub total_zombie_kills: u64,
    /// Total points accumulated by all players
    pub total_points: u64,
    /// Whether the battle is currently active
    pub active: bool,
}

// ============================================================
// Errors
// ============================================================

#[error_code]
pub enum GameError {
    #[msg("Invalid authentication")]
    InvalidAuth,
    #[msg("A game session is already active")]
    GameAlreadyActive,
    #[msg("No game session is currently active")]
    GameNotActive,
    #[msg("The battle room is full")]
    BattleRoomFull,
}
