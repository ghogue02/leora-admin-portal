-- Update Travis user password with bcrypt hash for "SalesDemo2025!"
UPDATE "User"
SET "hashedPassword" = '$2b$10$2Ec2j2oDYpWyB/Vh41B9feQku2lM22lUIhjOqUnYoIqUaqhryfZzu'
WHERE email = 'travis@wellcrafted.com';
