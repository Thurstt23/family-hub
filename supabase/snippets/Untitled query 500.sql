BEGIN;                                                                                                                                
SET LOCAL ROLE authenticated;                                                                                                         
-- Replace the UUID below with the actual ID of your test user from step 2                                                            
SET LOCAL request.jwt.claims = '{"sub": "11111111-2222-3333-4444-555555555555"}';                                                     
                                                                                                                                      
SELECT id, email, status FROM public.profiles;                                                                                        
COMMIT;