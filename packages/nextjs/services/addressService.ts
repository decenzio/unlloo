// Define response data types based on the API responses
interface CountersData {
  transactions_count: string;
  token_transfers_count: string;
  gas_usage_count: string;
  validations_count: string;
}

interface AddressData {
  block_number_balance_updated_at: number;
  coin_balance: string;
  creation_transaction_hash: string | null;
  creator_address_hash: string | null;
  ens_domain_name: string | null;
  exchange_rate: string;
  has_beacon_chain_withdrawals: boolean;
  has_logs: boolean;
  has_token_transfers: boolean;
  has_tokens: boolean;
  has_validated_blocks: boolean;
  hash: string;
  implementations: any[];
  is_contract: boolean;
  is_scam: boolean;
  is_verified: boolean;
  metadata: any | null;
  name: string | null;
  private_tags: any[];
  proxy_type: string | null;
  public_tags: any[];
  token: any | null;
  watchlist_address_id: string | null;
  watchlist_names: string[];
}

// Token data types
interface Token {
  address: string;
  address_hash: string;
  circulating_market_cap: string | null;
  decimals: string | null;
  exchange_rate: string | null;
  holders: string;
  holders_count: string;
  icon_url: string | null;
  name: string;
  symbol: string;
  total_supply: string | null;
  type: string;
  volume_24h: string | null;
}

interface TokenItem {
  token: Token;
  token_id: string | null;
  token_instance: any | null;
  value: string;
}

interface TokensData {
  items: TokenItem[];
  next_page_params?: {
    fiat_value: string;
    id: number;
    items_count: number;
    value: string;
  };
}

// NFT data types
interface NFTMetadata {
  attributes?: Array<{
    display_type?: string;
    trait_type: string;
    value: string | number;
    max_value?: string | number;
  }>;
  background_image?: string;
  description?: string;
  external_url?: string;
  image?: string;
  image_url?: string;
  is_normalized?: boolean;
  name?: string;
  url?: string;
  version?: number;
  created_by?: string;
  dna?: string;
  [key: string]: any; // For additional metadata fields
}

interface NFTItem {
  animation_url: string | null;
  external_app_url: string | null;
  id: string;
  image_url: string | null;
  is_unique: boolean | null;
  media_type: string | null;
  media_url: string | null;
  metadata: NFTMetadata | null;
  owner: string | null;
  thumbnails: any | null;
  token: Token;
  token_type: string;
  value: string;
}

interface NFTData {
  items: NFTItem[];
  next_page_params?: {
    items_count: number;
    token_contract_address_hash?: string;
    token_id?: string;
    token_type?: string;
  };
}

export type CombinedData = AddressData &
  CountersData & {
    tokens: TokensData;
    nfts: NFTData;
  };

export async function fetchAddressData(address: string): Promise<CombinedData> {
  const headers = { accept: "application/json" };
  const baseUrl = "https://eth.blockscout.com/api/v2/addresses";

  const [countersRes, addressRes, tokensRes, nftsRes] = await Promise.all([
    fetch(`${baseUrl}/${address}/counters`, { headers, next: { revalidate: 60 } }),
    fetch(`${baseUrl}/${address}`, { headers, next: { revalidate: 60 } }),
    fetch(`${baseUrl}/${address}/tokens?type=ERC-20%2CERC-721%2CERC-1155`, { headers, next: { revalidate: 60 } }),
    fetch(`${baseUrl}/${address}/nft?type=ERC-721%2CERC-404%2CERC-1155`, { headers, next: { revalidate: 60 } }),
  ]);

  if (!countersRes.ok || !addressRes.ok || !tokensRes.ok || !nftsRes.ok) {
    throw new Error("Failed to fetch data from Blockscout API");
  }

  const countersData = (await countersRes.json()) as CountersData;
  const addressData = (await addressRes.json()) as AddressData;
  const tokensData = (await tokensRes.json()) as TokensData;
  const nftsData = (await nftsRes.json()) as NFTData;

  return {
    ...addressData,
    ...countersData,
    tokens: tokensData,
    nfts: nftsData,
  };
}
