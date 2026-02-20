create or replace function get_seller_stats(target_seller_id uuid)
returns json
language plpgsql
security definer
as $$
declare
  result json;
begin
  select json_build_object(
    'sales_count', count(*),
    'total_revenue', coalesce(sum(budget), 0)
  )
  into result
  from leads
  where seller_id = target_seller_id and status = 'fechado';
  
  return result;
end;
$$;
