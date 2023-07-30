BEGIN TRANSACTION;
DROP TABLE IF EXISTS "twitter_data";
CREATE TABLE IF NOT EXISTS `twitter_data` (
  	`id` integer NOT NULL PRIMARY KEY AUTOINCREMENT,
  	`uid` integer NOT NULL DEFAULT '0',
    `name` text COLLATE BINARY,
    `display_name` text COLLATE BINARY,
    `following` integer NOT NULL DEFAULT '0',
    `followers` integer NOT NULL DEFAULT '0',
    `media_count` integer NOT NULL DEFAULT '0',
    `statuses_count` integer NOT NULL DEFAULT '0',
    `timestamp` integer NOT NULL DEFAULT '0'
)
DROP TABLE IF EXISTS "v2_twitter_tweets";
CREATE TABLE IF NOT EXISTS "v2_twitter_tweets" (
	"id"	integer NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
	"tweet_id"	integer NOT NULL UNIQUE,
	"origin_tweet_id"	integer NOT NULL DEFAULT '0',
	"conversation_id_str"	integer NOT NULL DEFAULT '0',
	"uid"	integer NOT NULL DEFAULT '0',
	"name"	text NOT NULL,
	"display_name"	text NOT NULL,
	"media"	integer NOT NULL DEFAULT '0',
	"video"	integer NOT NULL DEFAULT '0',
	"card"	text COLLATE BINARY,
	"poll"	integer NOT NULL DEFAULT '0',
	"quote_status"	integer NOT NULL DEFAULT '0',
	"source"	text COLLATE BINARY,
	"full_text"	longtext NOT NULL,
	"full_text_origin"	longtext NOT NULL,
	"retweet_from"	text COLLATE BINARY,
	"retweet_from_name"	text COLLATE BINARY,
	"translate"	longtext COLLATE BINARY,
	"translate_source"	text COLLATE BINARY,
	"hidden"	integer NOT NULL DEFAULT '0',
	"dispute"	integer NOT NULL DEFAULT '0',
	"time"	integer NOT NULL DEFAULT '0'
);
DROP TABLE IF EXISTS "v2_twitter_quote";
CREATE TABLE IF NOT EXISTS "v2_twitter_quote" (
	"id"	integer NOT NULL PRIMARY KEY AUTOINCREMENT,
	"uid"	integer NOT NULL DEFAULT '0',
	"tweet_id"	integer NOT NULL DEFAULT '0' UNIQUE,
	"name"	text COLLATE BINARY,
	"display_name"	text COLLATE BINARY,
	"full_text"	text COLLATE BINARY,
	"full_text_origin"	text COLLATE BINARY,
	"time"	integer NOT NULL DEFAULT '0',
	"media"	integer NOT NULL DEFAULT '0',
	"video"	integer NOT NULL DEFAULT '0'
);
DROP TABLE IF EXISTS "v2_twitter_polls";
CREATE TABLE IF NOT EXISTS "v2_twitter_polls" (
	"id"	integer NOT NULL PRIMARY KEY AUTOINCREMENT,
	"uid"	integer NOT NULL DEFAULT '0',
	"tweet_id"	integer NOT NULL DEFAULT '0',
	"origin_tweet_id"	integer NOT NULL DEFAULT '0',
	"choice_label"	text NOT NULL,
	"poll_order"	integer NOT NULL,
	"end_datetime"	integer NOT NULL,
	"count"	integer NOT NULL DEFAULT '0',
	"checked"	integer NOT NULL DEFAULT '0',
	"hidden"	integer NOT NULL DEFAULT '0'
);
DROP TABLE IF EXISTS "v2_twitter_media";
CREATE TABLE IF NOT EXISTS "v2_twitter_media" (
	"id"	integer NOT NULL PRIMARY KEY AUTOINCREMENT,
	"tweet_id"	integer NOT NULL DEFAULT '0',
	"uid"	integer NOT NULL DEFAULT '0',
	"cover"	text NOT NULL,
	"url"	text NOT NULL,
	"filename"	text NOT NULL,
	"basename"	text COLLATE BINARY,
	"extension"	text NOT NULL,
	"content_type"	text NOT NULL,
	"bitrate"	integer NOT NULL,
	"origin_type"	text NOT NULL,
	"origin_info_width"	integer NOT NULL,
	"origin_info_height"	integer NOT NULL,
	"title"	text COLLATE BINARY,
	"description"	text COLLATE BINARY,
	"media_key"	text COLLATE BINARY,
	"source"	text COLLATE BINARY,
	"blurhash"	text COLLATE BINARY,
	"deleted"	integer DEFAULT '0',
	"hidden"	integer NOT NULL DEFAULT '0'
);
DROP TABLE IF EXISTS "v2_twitter_entities";
CREATE TABLE IF NOT EXISTS "v2_twitter_entities" (
	"id"	integer NOT NULL PRIMARY KEY AUTOINCREMENT,
	"uid"	integer NOT NULL DEFAULT '0',
	"tweet_id"	integer NOT NULL DEFAULT '0',
	"type"	text NOT NULL,
	"text"	text NOT NULL,
	"expanded_url"	text NOT NULL,
	"url"	text NOT NULL,
	"indices_start"	integer NOT NULL,
	"indices_end"	integer NOT NULL,
	"length"	integer NOT NULL,
	"timestamp"	integer NOT NULL DEFAULT '0',
	"hidden"	integer NOT NULL DEFAULT '0'
);
DROP TABLE IF EXISTS "v2_twitter_cards";
CREATE TABLE IF NOT EXISTS "v2_twitter_cards" (
	"id"	integer NOT NULL PRIMARY KEY AUTOINCREMENT,
	"uid"	integer NOT NULL DEFAULT '0',
	"tweet_id"	integer NOT NULL DEFAULT '0',
	"title"	text COLLATE BINARY,
	"description"	text COLLATE BINARY,
	"vanity_url"	text COLLATE BINARY,
	"type"	text COLLATE BINARY,
	"secondly_type"	text COLLATE BINARY,
	"url"	text COLLATE BINARY,
	"media"	integer NOT NULL DEFAULT '0',
	"unified_card_app"	integer NOT NULL DEFAULT '0',
	"hidden"	integer NOT NULL DEFAULT '0'
);
DROP TABLE IF EXISTS "v2_twitter_card_app";
CREATE TABLE IF NOT EXISTS "v2_twitter_card_app" (
	"id"	integer NOT NULL PRIMARY KEY AUTOINCREMENT,
	"tweet_id"	integer NOT NULL DEFAULT '0',
	"uid"	integer NOT NULL DEFAULT '0',
	"unified_card_type"	text NOT NULL,
	"type"	text NOT NULL,
	"appid"	text NOT NULL,
	"country_code"	text,
	"title"	text NOT NULL,
	"category"	text NOT NULL
);
DROP TABLE IF EXISTS "v2_server_info";
CREATE TABLE IF NOT EXISTS "v2_server_info" (
	"id"	integer NOT NULL PRIMARY KEY AUTOINCREMENT,
	"time"	integer NOT NULL,
	"microtime"	integer NOT NULL,
	"total_users"	integer NOT NULL,
	"total_tweets"	integer NOT NULL,
	"total_req_tweets"	integer NOT NULL,
	"total_throw_tweets"	integer NOT NULL,
	"total_req_times"	integer NOT NULL,
	"total_errors_count"	integer DEFAULT '0',
	"total_media_count"	integer NOT NULL,
	"total_time_cost"	float NOT NULL
);
DROP TABLE IF EXISTS "v2_error_log";
CREATE TABLE IF NOT EXISTS "v2_error_log" (
	"id"	integer NOT NULL PRIMARY KEY AUTOINCREMENT,
	"uid"	integer NOT NULL DEFAULT '0',
	"name"	text,
	"code"	integer NOT NULL,
	"message"	text COLLATE BINARY,
	"timestamp"	integer NOT NULL DEFAULT '0'
);
DROP TABLE IF EXISTS "v2_config";
CREATE TABLE IF NOT EXISTS "v2_config" (
	"id"	integer NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
	"data_origin"	longtext NOT NULL,
	"data_output"	longtext NOT NULL,
	"md5"	char(32) NOT NULL,
	"timestamp"	integer NOT NULL
);
DROP TABLE IF EXISTS "v2_account_info";
CREATE TABLE IF NOT EXISTS "v2_account_info" (
	"id"	integer NOT NULL PRIMARY KEY AUTOINCREMENT,
	"uid"	integer NOT NULL DEFAULT '0' UNIQUE,
	"name"	text NOT NULL,
	"display_name"	text NOT NULL,
	"header"	text NOT NULL,
	"banner"	integer NOT NULL DEFAULT '0',
	"following"	integer NOT NULL DEFAULT '0',
	"followers"	integer NOT NULL DEFAULT '0',
	"media_count"	integer NOT NULL DEFAULT '0',
	"created_at"	integer NOT NULL,
	"description"	longtext NOT NULL,
	"description_origin"	longtext NOT NULL,
	"verified"	integer NOT NULL DEFAULT '0',
	"organization"	integer NOT NULL DEFAULT '0',
	"top"	integer NOT NULL DEFAULT '0',
	"last_check"	timestamp NOT NULL DEFAULT current_timestamp,
	"statuses_count"	integer NOT NULL DEFAULT '0',
	"cursor"	text COLLATE BINARY,
	"last_cursor"	text NOT NULL,
	"deleted"	integer NOT NULL DEFAULT '0',
	"locked"	integer NOT NULL DEFAULT '0',
	"hidden"	integer NOT NULL DEFAULT '0',
	"new"	integer NOT NULL DEFAULT '0'
);
DROP TABLE IF EXISTS "tmp_twitter_data";
CREATE TABLE IF NOT EXISTS "tmp_twitter_data" (
	"uid"	integer NOT NULL DEFAULT '0',
	"name"	text COLLATE BINARY,
	"display_name"	text COLLATE BINARY,
	"following"	integer NOT NULL DEFAULT '0',
	"followers"	integer NOT NULL DEFAULT '0',
	"media_count"	integer NOT NULL DEFAULT '0',
	"statuses_count"	integer NOT NULL DEFAULT '0',
	"timestamp"	integer NOT NULL DEFAULT '0',
	"visible"	integer NOT NULL DEFAULT '1',
	PRIMARY KEY("uid")
);
DROP INDEX IF EXISTS "idx_v2_twitter_tweets_full_text_origin";
CREATE INDEX IF NOT EXISTS "idx_v2_twitter_tweets_full_text_origin" ON "v2_twitter_tweets" (
	"full_text_origin"
);
DROP INDEX IF EXISTS "idx_v2_twitter_tweets_origin_tweet_id";
CREATE INDEX IF NOT EXISTS "idx_v2_twitter_tweets_origin_tweet_id" ON "v2_twitter_tweets" (
	"origin_tweet_id"
);
DROP INDEX IF EXISTS "idx_v2_twitter_tweets_conversation_id_str";
CREATE INDEX IF NOT EXISTS "idx_v2_twitter_tweets_conversation_id_str" ON "v2_twitter_tweets" (
	"conversation_id_str"
);
DROP INDEX IF EXISTS "idx_v2_twitter_tweets_uid";
CREATE INDEX IF NOT EXISTS "idx_v2_twitter_tweets_uid" ON "v2_twitter_tweets" (
	"uid"
);
DROP INDEX IF EXISTS "idx_v2_twitter_card_app_uid";
CREATE INDEX IF NOT EXISTS "idx_v2_twitter_card_app_uid" ON "v2_twitter_card_app" (
	"uid"
);
DROP INDEX IF EXISTS "idx_v2_twitter_card_app_tweet_id";
CREATE INDEX IF NOT EXISTS "idx_v2_twitter_card_app_tweet_id" ON "v2_twitter_card_app" (
	"tweet_id"
);
DROP INDEX IF EXISTS "idx_v2_twitter_media_uid";
CREATE INDEX IF NOT EXISTS "idx_v2_twitter_media_uid" ON "v2_twitter_media" (
	"uid"
);
DROP INDEX IF EXISTS "idx_v2_twitter_media_tweet_id";
CREATE INDEX IF NOT EXISTS "idx_v2_twitter_media_tweet_id" ON "v2_twitter_media" (
	"tweet_id"
);
DROP INDEX IF EXISTS "idx_v2_twitter_quote_tweet_id";
CREATE INDEX IF NOT EXISTS "idx_v2_twitter_quote_tweet_id" ON "v2_twitter_quote" (
	"tweet_id"
);
DROP INDEX IF EXISTS "idx_v2_twitter_quote_uid";
CREATE INDEX IF NOT EXISTS "idx_v2_twitter_quote_uid" ON "v2_twitter_quote" (
	"uid"
);
DROP INDEX IF EXISTS "idx_v2_error_log_code";
CREATE INDEX IF NOT EXISTS "idx_v2_error_log_code" ON "v2_error_log" (
	"code"
);
DROP INDEX IF EXISTS "idx_v2_error_log_uid";
CREATE INDEX IF NOT EXISTS "idx_v2_error_log_uid" ON "v2_error_log" (
	"uid"
);
DROP INDEX IF EXISTS "idx_v2_error_log_timestamp";
CREATE INDEX IF NOT EXISTS "idx_v2_error_log_timestamp" ON "v2_error_log" (
	"timestamp"
);
DROP INDEX IF EXISTS "idx_tmp_twitter_data_uid";
CREATE INDEX IF NOT EXISTS "idx_tmp_twitter_data_uid" ON "tmp_twitter_data" (
	"uid"
);
DROP INDEX IF EXISTS "idx_v2_twitter_polls_tweet_id";
CREATE INDEX IF NOT EXISTS "idx_v2_twitter_polls_tweet_id" ON "v2_twitter_polls" (
	"tweet_id"
);
DROP INDEX IF EXISTS "idx_v2_twitter_polls_uid";
CREATE INDEX IF NOT EXISTS "idx_v2_twitter_polls_uid" ON "v2_twitter_polls" (
	"uid"
);
DROP INDEX IF EXISTS "idx_v2_server_info_microtime";
CREATE INDEX IF NOT EXISTS "idx_v2_server_info_microtime" ON "v2_server_info" (
	"microtime"
);
DROP INDEX IF EXISTS "idx_v2_server_info_time";
CREATE INDEX IF NOT EXISTS "idx_v2_server_info_time" ON "v2_server_info" (
	"time"
);
DROP INDEX IF EXISTS "idx_v2_twitter_entities_timestamp";
CREATE INDEX IF NOT EXISTS "idx_v2_twitter_entities_timestamp" ON "v2_twitter_entities" (
	"timestamp"
);
DROP INDEX IF EXISTS "idx_v2_twitter_entities_tweet_id";
CREATE INDEX IF NOT EXISTS "idx_v2_twitter_entities_tweet_id" ON "v2_twitter_entities" (
	"tweet_id"
);
DROP INDEX IF EXISTS "idx_v2_twitter_entities_uid";
CREATE INDEX IF NOT EXISTS "idx_v2_twitter_entities_uid" ON "v2_twitter_entities" (
	"uid"
);
DROP INDEX IF EXISTS "idx_v2_twitter_cards_tweet_id";
CREATE INDEX IF NOT EXISTS "idx_v2_twitter_cards_tweet_id" ON "v2_twitter_cards" (
	"tweet_id"
);
DROP INDEX IF EXISTS "idx_v2_twitter_cards_uid";
CREATE INDEX IF NOT EXISTS "idx_v2_twitter_cards_uid" ON "v2_twitter_cards" (
	"uid"
);

DROP TABLE IF EXISTS "v2_fts";
;
create virtual table v2_fts using FTS5(tweet_id, full_text_origin, uid, time, retweet_from, media UNINDEXED, hidden UNINDEXED, content="v2_twitter_tweets", content_rowid="tweet_id");

DROP TRIGGER IF EXISTS "v2_fts_update";
CREATE TRIGGER v2_fts_update AFTER UPDATE ON v2_twitter_tweets BEGIN
  INSERT INTO v2_fts(v2_fts, rowid, full_text_origin, uid, time, retweet_from, media, hidden) VALUES('delete', old.tweet_id, old.full_text_origin, old.uid, old.time, old.retweet_from, old.media, old.hidden);
  INSERT INTO v2_fts(rowid, full_text_origin, uid, time, retweet_from, media, hidden) VALUES (new.tweet_id, new.full_text_origin, new.uid, new.time, new.retweet_from, new.media, new.hidden);
END;
DROP TRIGGER IF EXISTS "v2_fts_del";
CREATE TRIGGER v2_fts_del AFTER DELETE ON v2_twitter_tweets BEGIN
  INSERT INTO v2_fts(v2_fts, rowid, full_text_origin, uid, time, retweet_from, media, hidden) VALUES('delete', old.tweet_id, old.full_text_origin, old.uid, old.time, old.retweet_from, old.media, old.hidden);
END;
DROP TRIGGER IF EXISTS "v2_fts_add";
CREATE TRIGGER v2_fts_add AFTER INSERT ON v2_twitter_tweets BEGIN
  INSERT INTO v2_fts(rowid, full_text_origin, uid, time, retweet_from, media, hidden) VALUES (new.tweet_id, new.full_text_origin, new.uid, new.time, new.retweet_from, new.media, new.hidden);
END;
COMMIT;
