SELECT p.email, p.status, r.role, t.slug as membership_tier                                                                           
FROM public.profiles p                                                                                                                
JOIN public.user_roles r ON p.id = r.user_id                                                                                          
JOIN public.memberships m ON p.id = m.user_id                                                                                         
JOIN public.membership_tiers t ON m.tier_id = t.id                                                                                    
ORDER BY p.created_at DESC                                                                                                            
LIMIT 5;  