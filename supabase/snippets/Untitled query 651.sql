-- Check total row count                                                                                                              
SELECT count(*) FROM public.profiles;                                                                                                 
                                                                                                                                      
-- Prove the GIN index is being utilized for search                                                                                   
EXPLAIN ANALYZE                                                                                                                       
SELECT id, handle, full_name, avatar_url, city, generation                                                                            
FROM public.profiles                                                                                                                  
WHERE status = 'active'                                                                                                               
AND search_vector @@ websearch_to_tsquery('sawyer');