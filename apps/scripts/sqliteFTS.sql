create virtual table v1_fts using FTS5(tweet_id, full_text_origin, content="twitter_tweets", content_rowid="tweet_id");

CREATE TRIGGER v1_fts_add AFTER INSERT ON twitter_tweets BEGIN
  INSERT INTO v1_fts(rowid, full_text_origin) VALUES (new.tweet_id, new.full_text_origin);
END;
CREATE TRIGGER v1_fts_del AFTER DELETE ON twitter_tweets BEGIN
  INSERT INTO v1_fts(v1_fts, rowid, full_text_origin) VALUES('delete', old.tweet_id, old.full_text_origin);
END;
CREATE TRIGGER v1_fts_update AFTER UPDATE ON twitter_tweets BEGIN
  INSERT INTO v1_fts(v1_fts, rowid, full_text_origin) VALUES('delete', old.tweet_id, old.full_text_origin);
  INSERT INTO v1_fts(rowid, full_text_origin) VALUES (new.tweet_id, new.full_text_origin);
END;

INSERT INTO v1_fts(v1_fts) VALUES('rebuild');

/*insert into v1_fts select tweet_id, full_text_origin from twitter_tweets;*/



create virtual table v2_fts using FTS5(tweet_id, full_text_origin, uid, time, retweet_from, media UNINDEXED, hidden UNINDEXED, content="v2_twitter_tweets", content_rowid="tweet_id");

CREATE TRIGGER v2_fts_add AFTER INSERT ON v2_twitter_tweets BEGIN
  INSERT INTO v2_fts(rowid, full_text_origin, uid, time, retweet_from, media, hidden) VALUES (new.tweet_id, new.full_text_origin, new.uid, new.time, new.retweet_from, new.media, new.hidden);
END;
CREATE TRIGGER v2_fts_del AFTER DELETE ON v2_twitter_tweets BEGIN
  INSERT INTO v2_fts(v2_fts, rowid, full_text_origin, uid, time, retweet_from, media, hidden) VALUES('delete', old.tweet_id, old.full_text_origin, old.uid, old.time, old.retweet_from, old.media, old.hidden);
END;
CREATE TRIGGER v2_fts_update AFTER UPDATE ON v2_twitter_tweets BEGIN
  INSERT INTO v2_fts(v2_fts, rowid, full_text_origin, uid, time, retweet_from, media, hidden) VALUES('delete', old.tweet_id, old.full_text_origin, old.uid, old.time, old.retweet_from, old.media, old.hidden);
  INSERT INTO v2_fts(rowid, full_text_origin, uid, time, retweet_from, media, hidden) VALUES (new.tweet_id, new.full_text_origin, new.uid, new.time, new.retweet_from, new.media, new.hidden);
END;

INSERT INTO v2_fts(v2_fts) VALUES('rebuild');

/*insert into v2_fts select tweet_id, full_text_origin, hidden from v2_twitter_tweets;*/

/* some test sample */
/* known issue: query include text will slooooow */
SELECT CAST(tweet_id AS text) AS `tweet_id`, CAST(origin_tweet_id AS text) AS `origin_tweet_id`, CAST(conversation_id_str AS text) AS `conversation_id_str`, CAST(uid AS text) AS `uid`, `name`, `display_name`, `media`, `video`, `card`, `poll`, CAST(quote_status AS text) AS `quote_status`, `source`, `full_text`, `full_text_origin`, `retweet_from`, `retweet_from_name`, `dispute`, `time` FROM `v2_twitter_tweets` AS `v2_twitter_tweets` WHERE (tweet_id IN (SELECT rowid FROM v2_fts WHERE full_text_origin MATCH 'バンドリ' AND rowid > 0 AND `hidden` = 0 ORDER BY rowid DESC LIMIT 21));

SELECT CAST(tweet_id AS text) AS `tweet_id`, CAST(origin_tweet_id AS text) AS `origin_tweet_id`, CAST(conversation_id_str AS text) AS `conversation_id_str`, CAST(uid AS text) AS `uid`, `name`, `display_name`, `media`, `video`, `card`, `poll`, CAST(quote_status AS text) AS `quote_status`, `source`, `full_text`, `full_text_origin`, `retweet_from`, `retweet_from_name`, `dispute`, `time` FROM `v2_twitter_tweets` AS `v2_twitter_tweets` WHERE (tweet_id IN (SELECT rowid FROM v2_fts WHERE full_text_origin MATCH 'バンドリ' AND rowid > 0 AND `hidden` = 0 AND uid=3009772568 AND time > 0 ORDER BY rowid DESC LIMIT 21));