-- Create table for tracking Special Deal purchases
create table public.special_deal_purchases (
  id serial not null,
  user_id text not null,
  special_deal_id integer not null,
  purchased_at timestamp with time zone not null default now(),
  constraint special_deal_purchases_pkey primary key (id),
  constraint special_deal_purchases_special_deal_id_fkey foreign KEY (special_deal_id) references special_offer (id),
  constraint special_deal_purchases_user_id_fkey foreign KEY (user_id) references users (username)
) TABLESPACE pg_default; 