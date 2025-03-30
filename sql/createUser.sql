WITH new_user AS (
    INSERT INTO users (email, password)
        VALUES ($1, $2)
        RETURNING id
), new_profile AS (
    INSERT INTO profiles (user_id, first_name, last_name, avatar_url, date_of_birth)
        VALUES ((SELECT id FROM new_user), NULL, NULL, NULL, NULL)
        RETURNING user_id
)
INSERT INTO files (
    id,
    user_id,
    name,
    is_dir,
    parent_id,
    url,
    created_at
)