create table if not exists shopping_retailers (
  id uuid primary key,
  slug text not null,
  display_name text not null,
  country_code text not null,
  supports_catalogue boolean not null,
  supports_offers boolean not null,
  supports_basket_revalidation boolean not null,
  supports_checkout_handoff boolean not null,
  supports_direct_checkout boolean not null,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists shopping_retailers_slug_uq
  on shopping_retailers(slug);

create table if not exists shopping_products (
  id uuid primary key,
  canonical_name text not null,
  brand text,
  category text not null,
  sub_category text,
  gtin text,
  size_value numeric(12,4),
  size_unit text,
  image_url text,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists shopping_products_gtin_uq
  on shopping_products(gtin) where gtin is not null;
create index if not exists shopping_products_name_idx
  on shopping_products using btree(lower(canonical_name));

create table if not exists shopping_retailer_listings (
  id uuid primary key,
  product_id uuid not null references shopping_products(id) on delete cascade,
  retailer_id uuid not null references shopping_retailers(id) on delete cascade,
  external_id text not null,
  external_url text,
  source_name text not null,
  title text not null,
  brand text,
  package_text text,
  image_url text,
  gtin text,
  availability text not null,
  last_observed_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists shopping_retailer_listings_external_uq
  on shopping_retailer_listings(retailer_id, external_id);
create index if not exists shopping_retailer_listings_product_idx
  on shopping_retailer_listings(product_id);

create table if not exists shopping_price_observations (
  id uuid primary key,
  retailer_listing_id uuid not null references shopping_retailer_listings(id) on delete cascade,
  price numeric(12,4) not null check (price >= 0),
  currency text not null,
  reference_price numeric(12,4),
  unit_price numeric(12,4),
  unit_basis text,
  promotion_id text,
  observed_at timestamptz not null,
  source_updated_at timestamptz,
  provenance jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists shopping_price_observations_listing_time_idx
  on shopping_price_observations(retailer_listing_id, observed_at desc);

create table if not exists shopping_offers (
  id uuid primary key,
  retailer_listing_id uuid not null references shopping_retailer_listings(id) on delete cascade,
  provider_offer_id text,
  offer_type text not null,
  headline text not null,
  current_price numeric(12,4) not null check (current_price >= 0),
  reference_price numeric(12,4),
  discount_percent numeric(7,3),
  starts_at timestamptz,
  ends_at timestamptz,
  membership_required boolean not null default false,
  terms_text text,
  observed_at timestamptz not null,
  status text not null,
  provenance jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists shopping_offers_provider_identity_uq
  on shopping_offers(retailer_listing_id, provider_offer_id)
  where provider_offer_id is not null;
create index if not exists shopping_offers_status_end_idx
  on shopping_offers(status, ends_at);

create table if not exists shopping_lists (
  id uuid primary key,
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  status text not null,
  created_by_person_id uuid not null references people(id) on delete restrict,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists shopping_list_items (
  id uuid primary key,
  shopping_list_id uuid not null references shopping_lists(id) on delete cascade,
  requested_text text not null,
  product_id uuid references shopping_products(id) on delete set null,
  quantity numeric(12,4) not null check (quantity > 0),
  preferred_brand text,
  substitution_policy text not null,
  status text not null
);

create table if not exists shopping_baskets (
  id uuid primary key,
  household_id uuid not null references households(id) on delete cascade,
  status text not null,
  currency text not null,
  created_by_person_id uuid not null references people(id) on delete restrict,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists shopping_basket_items (
  id uuid primary key,
  basket_id uuid not null references shopping_baskets(id) on delete cascade,
  product_id uuid not null references shopping_products(id) on delete restrict,
  preferred_listing_id uuid references shopping_retailer_listings(id) on delete set null,
  quantity numeric(12,4) not null check (quantity > 0),
  substitution_policy text not null,
  selected_retailer_id uuid references shopping_retailers(id) on delete set null
);

create index if not exists shopping_basket_items_basket_idx
  on shopping_basket_items(basket_id);

create table if not exists shopping_basket_quotes (
  id uuid primary key,
  basket_id uuid not null references shopping_baskets(id) on delete cascade,
  strategy text not null,
  retailer_segments jsonb not null,
  unresolved_item_ids jsonb not null default '[]'::jsonb,
  items_subtotal numeric(12,4) not null,
  fees_estimate numeric(12,4),
  total_estimate numeric(12,4) not null,
  baseline_total numeric(12,4),
  estimated_saving numeric(12,4),
  quoted_at timestamptz not null,
  expires_at timestamptz not null,
  freshness text not null
);

create table if not exists shopping_checkout_sessions (
  id uuid primary key,
  basket_id uuid not null references shopping_baskets(id) on delete cascade,
  basket_quote_id uuid not null references shopping_basket_quotes(id) on delete cascade,
  retailer_id uuid not null references shopping_retailers(id) on delete restrict,
  mode text not null,
  status text not null,
  handoff_url text,
  provider_reference text,
  validated_at timestamptz,
  expires_at timestamptz,
  created_by_person_id uuid not null references people(id) on delete restrict,
  created_at timestamptz not null
);

create index if not exists shopping_checkout_sessions_basket_idx
  on shopping_checkout_sessions(basket_id, created_at desc);

create table if not exists shopping_product_matches (
  id uuid primary key,
  product_id uuid not null references shopping_products(id) on delete cascade,
  retailer_listing_id uuid not null references shopping_retailer_listings(id) on delete cascade,
  method text not null,
  confidence numeric(6,5) not null check (confidence >= 0 and confidence <= 1),
  exact boolean not null,
  created_at timestamptz not null,
  unique(product_id, retailer_listing_id)
);

create table if not exists shopping_import_failures (
  id uuid primary key,
  connector_id text not null,
  reason text not null,
  record_kind text,
  external_id text,
  captured_at timestamptz not null
);
