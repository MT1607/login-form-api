update profiles
set first_name = $1, last_name = $2, avatar_url = $3, date_of_birth = $4
where user_id = $5;