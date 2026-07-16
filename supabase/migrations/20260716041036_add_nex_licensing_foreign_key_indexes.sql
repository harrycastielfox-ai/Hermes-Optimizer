create index entitlements_plan_id_idx
on public.entitlements(plan_id);

create index entitlements_source_code_id_idx
on public.entitlements(source_code_id);

create index license_codes_plan_id_idx
on public.license_codes(plan_id);

create index license_codes_redeemed_by_idx
on public.license_codes(redeemed_by);

create index license_redemptions_plan_id_idx
on public.license_redemptions(plan_id);
