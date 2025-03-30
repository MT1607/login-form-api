INSERT INTO files (
    id, user_id, name, is_dir, parent_id, path
) VALUES (
             $1, $2, $3, $4, $5, $6
         )
    ON CONFLICT (id)
DO UPDATE SET
    name = $3,
           is_dir = $4,
           parent_id = $5,
           path = $6