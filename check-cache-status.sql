-- Check if cache and throttle are working
SELECT 'Cache entries' as type, COUNT(*) as count FROM ppt_cache
UNION ALL
SELECT 'Throttle entries' as type, COUNT(*) as count FROM ppt_throttle
UNION ALL
SELECT 'Graded sales' as type, COUNT(*) as count FROM graded_sales WHERE card_id LIKE 'cel25c%';

-- If there are throttle entries, show details
SELECT 'Throttle details' as info, set_id, number, last_status, 
       last_attempt, next_earliest,
       CASE WHEN next_earliest > now() THEN 'COOLING_DOWN' ELSE 'READY' END as status
FROM ppt_throttle 
WHERE set_id = 'cel25c'
ORDER BY last_attempt DESC
LIMIT 5;
