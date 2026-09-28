BEGIN;                                                                                                                                
SET LOCAL ROLE anon;                                                                                                                  
SELECT * FROM public.profiles;                                                                                                        
COMMIT;  