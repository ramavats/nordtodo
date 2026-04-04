/// Integration adapters — future-facing module structure.
/// Each integration implements the IntegrationAdapter trait.
/// The adapter pattern ensures the core task model is decoupled from any provider.

pub mod adapter;
pub mod google;
pub mod microsoft;
pub mod oauth;

// Re-export adapter trait (used by integration impls)
#[allow(unused_imports)]
pub use adapter::IntegrationAdapter;
