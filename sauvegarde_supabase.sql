--
-- PostgreSQL database dump
--

\restrict ehXniKSalk1UjagmXBeMhftCJSsZeDgYniAQNTlxufKjQAvCkXcAJ6iTgGFU4D4

-- Dumped from database version 17.12
-- Dumped by pg_dump version 17.12

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: artists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.artists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    artist_name text NOT NULL,
    bio text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: playlist_tracks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.playlist_tracks (
    playlist_id uuid NOT NULL,
    track_id uuid NOT NULL,
    "position" integer DEFAULT 0 NOT NULL
);


--
-- Name: playlists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.playlists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    artist_name text NOT NULL,
    track_title text NOT NULL,
    file_name text NOT NULL,
    stored_name text NOT NULL,
    mime_type text NOT NULL,
    file_size bigint NOT NULL,
    rights_model text NOT NULL,
    rights_confirmed boolean DEFAULT false NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    admin_note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    reviewed_at timestamp with time zone,
    CONSTRAINT submissions_rights_model_check CHECK ((rights_model = ANY (ARRAY['artist_retains_rights'::text, 'platform_license'::text]))),
    CONSTRAINT submissions_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);


--
-- Name: tracks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tracks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    submission_id uuid,
    artist_name text NOT NULL,
    title text NOT NULL,
    stored_name text NOT NULL,
    mime_type text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_published boolean DEFAULT true NOT NULL,
    cover_name text,
    cover_mime_type text,
    album_name text,
    genre text,
    duration integer,
    release_date date
);


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_sessions (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    display_name text NOT NULL,
    role text DEFAULT 'user'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['user'::text, 'admin'::text])))
);


--
-- Data for Name: artists; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: playlist_tracks; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: playlists; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: submissions; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: tracks; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.tracks VALUES ('1ac6d4cf-2412-44fd-a3df-a0eabf9656c4', NULL, 'FVLKO', 'Fly', 'Fly.wav', 'audio/wav', '2026-11-14 13:38:19.779017+01', true, 'jumpfly.jpeg', 'image/jpeg', 'Jump & Fly', 'Electronic', 214, '2026-11-14');


--
-- Data for Name: user_sessions; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.user_sessions VALUES ('ug2iQxS14zpdlmuTEjJKkzFma-1Ax1m4', '{"cookie":{"originalMaxAge":604800000,"expires":"2026-11-21T12:48:44.286Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"user":{"id":"6a93e323-e9bd-4896-bf80-2bb3f9911e50","email":"maxime.falkowski@ecosmail.fr","display_name":"FVLKO","role":"admin"}}', '2026-11-21 14:09:16');


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.users VALUES ('6a93e323-e9bd-4896-bf80-2bb3f9911e50', 'maxime.falkowski@ecosmail.fr', '$2b$12$S2e.LcV3bL4IlnGgv2iOAeYwz1DL/uEWAguqt6YcZryid2zLtQHlu', 'FVLKO', 'admin', '2026-11-14 13:31:18.425698+01');
INSERT INTO public.users VALUES ('b8afcda3-c90c-404c-af2e-d5c3061542a1', 'utilisateur@ecosmail.fr', '$2b$12$PyzlP/GyTZQGXh8UUp27helSZZdfe.2UHakY8QmUHGltENt/xK/Nu', 'Utilisateur', 'user', '2026-11-14 13:40:08.893922+01');


--
-- Name: artists artists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artists
    ADD CONSTRAINT artists_pkey PRIMARY KEY (id);


--
-- Name: playlist_tracks playlist_tracks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playlist_tracks
    ADD CONSTRAINT playlist_tracks_pkey PRIMARY KEY (playlist_id, track_id);


--
-- Name: playlists playlists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playlists
    ADD CONSTRAINT playlists_pkey PRIMARY KEY (id);


--
-- Name: user_sessions session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);


--
-- Name: submissions submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_pkey PRIMARY KEY (id);


--
-- Name: tracks tracks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tracks
    ADD CONSTRAINT tracks_pkey PRIMARY KEY (id);


--
-- Name: tracks tracks_submission_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tracks
    ADD CONSTRAINT tracks_submission_id_key UNIQUE (submission_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_session_expire" ON public.user_sessions USING btree (expire);


--
-- Name: idx_submissions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_submissions_status ON public.submissions USING btree (status, created_at DESC);


--
-- Name: idx_submissions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_submissions_user ON public.submissions USING btree (user_id, created_at DESC);


--
-- Name: idx_tracks_published; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tracks_published ON public.tracks USING btree (is_published, created_at DESC);


--
-- Name: artists artists_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artists
    ADD CONSTRAINT artists_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: playlist_tracks playlist_tracks_playlist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playlist_tracks
    ADD CONSTRAINT playlist_tracks_playlist_id_fkey FOREIGN KEY (playlist_id) REFERENCES public.playlists(id) ON DELETE CASCADE;


--
-- Name: playlist_tracks playlist_tracks_track_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playlist_tracks
    ADD CONSTRAINT playlist_tracks_track_id_fkey FOREIGN KEY (track_id) REFERENCES public.tracks(id) ON DELETE CASCADE;


--
-- Name: playlists playlists_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playlists
    ADD CONSTRAINT playlists_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: submissions submissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: tracks tracks_submission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tracks
    ADD CONSTRAINT tracks_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.submissions(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict ehXniKSalk1UjagmXBeMhftCJSsZeDgYniAQNTlxufKjQAvCkXcAJ6iTgGFU4D4

