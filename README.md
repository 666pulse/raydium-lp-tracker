# raydium lp tracker


```rust
/// Initializes a new AMM pool.

///   0. `[]` Spl Token program id
///   1. `[]` Associated Token program id
///   2. `[]` Sys program id
///   3. `[]` Rent program id
///   4. `[writable]` New AMM Account to create.
///   5. `[]` $authority derived from `create_program_address(&[AUTHORITY_AMM, &[nonce]])`.
///   6. `[writable]` AMM open orders Account
///   7. `[writable]` AMM lp mint Account
///   8. `[]` AMM coin mint Account
///   9. `[]` AMM pc mint Account
///   10. `[writable]` AMM coin vault Account. Must be non zero, owned by $authority.
///   11. `[writable]` AMM pc vault Account. Must be non zero, owned by $authority.
///   12. `[writable]` AMM target orders Account. To store plan orders informations.
///   13. `[]` AMM config Account, derived from `find_program_address(&[&&AMM_CONFIG_SEED])`.
///   14. `[]` AMM create pool fee destination Account
///   15. `[]` Market program id
///   16. `[writable]` Market Account. Market program is the owner.
///   17. `[writable, singer]` User wallet Account
///   18. `[]` User token coin Account
///   19. '[]` User token pc Account
///   20. `[writable]` User destination lp token ATA Account

#[repr(C)]
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct InitializeInstruction2 {
    /// nonce used to create valid program address
    pub nonce: u8,
    /// utc timestamps for pool open
    pub open_time: u64,
    /// init token pc amount
    pub init_pc_amount: u64,
    /// init token coin amount
    pub init_coin_amount: u64,
}
```

---

https://www.quicknode.com/guides/solana-development/3rd-party-integrations/track-raydium-lps

https://www.helius.dev/blog/how-to-monitor-a-raydium-liquidity-pool

https://docs.shyft.to/solana-indexers/case-studies/raydium/get-pool-by-address

https://docs.shyft.to/solana-indexers/case-studies/raydium/get-pool-and-openbook-market-info

https://gist.github.com/endrsmar/684c336c3729ec4472b2f337c50c3cdb
