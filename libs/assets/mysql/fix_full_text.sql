/* 
  mysql only, not supported mariadb
 */

ALTER TABLE `v2_twitter_tweets` DROP INDEX `full_text_original`;

ALTER TABLE `v2_twitter_tweets` ADD FULLTEXT(`full_text_original`) WITH parser ngram;