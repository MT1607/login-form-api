WITH new_user AS (
    INSERT INTO users (email, password)
        VALUES ($1, $2)
        RETURNING id
)
INSERT INTO profiles (user_id, first_name, last_name, date_of_birth)
VALUES ((SELECT id FROM new_user), NULL, NULL, NULL)
RETURNING user_id;