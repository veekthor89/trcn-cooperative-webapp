-- Drop forum tables
DROP TABLE IF EXISTS public.forum_comments CASCADE;
DROP TABLE IF EXISTS public.forum_posts CASCADE;

-- Rename savings_goals to special_contributions
ALTER TABLE public.savings_goals RENAME TO special_contributions;
ALTER TABLE public.special_contributions RENAME COLUMN goal_name TO contribution_name;