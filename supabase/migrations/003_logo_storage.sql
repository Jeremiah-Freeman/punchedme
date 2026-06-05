-- Public storage bucket for business logos (shown on wallet passes)
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;
