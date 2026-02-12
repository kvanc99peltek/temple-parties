-- Baseline schema for Temple Parties
-- Exported from Supabase dashboard on 2026-02-11

-- User profiles (linked to Supabase Auth)
CREATE TABLE user_profiles (
    id         UUID PRIMARY KEY REFERENCES auth.users (id),
    email      VARCHAR,
    username   VARCHAR UNIQUE,
    is_admin   BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Parties
CREATE TABLE parties (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       VARCHAR(50) NOT NULL,
    host        VARCHAR(30) NOT NULL,
    pin_label   VARCHAR(5),
    category    VARCHAR(50) NOT NULL,
    day         VARCHAR CHECK (day IN ('friday', 'saturday')),
    date        DATE,
    doors_open  VARCHAR(20) NOT NULL,
    address     VARCHAR(500) NOT NULL,
    latitude    NUMERIC(10, 8) NOT NULL,
    longitude   NUMERIC(11, 8) NOT NULL,
    going_count INTEGER DEFAULT 0,
    created_by  UUID REFERENCES user_profiles (id),
    status      VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    weekend_of  DATE NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- Junction table: which users are "going" to which parties
CREATE TABLE party_going (
    party_id   UUID REFERENCES parties (id) ON DELETE CASCADE,
    user_id    UUID REFERENCES user_profiles (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (party_id, user_id)
);
