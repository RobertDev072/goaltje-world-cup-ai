INSERT INTO public.user_roles (user_id, role)
VALUES ('948d6aaf-fe1a-44e2-8a4b-239572b48e4e', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;