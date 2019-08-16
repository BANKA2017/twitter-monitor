SET NAMES utf8;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;
SET sql_mode = 'NO_AUTO_VALUE_ON_ZERO';

SET NAMES utf8mb4;

DROP TABLE IF EXISTS `account_info`;
CREATE TABLE `account_info` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uid` bigint(20) NOT NULL,
  `name` text NOT NULL,
  `display_name` text NOT NULL,
  `header` text NOT NULL,
  `banner` int(11) NOT NULL,
  `following` int(11) NOT NULL,
  `followers` int(11) NOT NULL,
  `created_at` int(11) NOT NULL,
  `description` longtext NOT NULL,
  `description_origin` longtext NOT NULL,
  `verified` tinyint(4) NOT NULL DEFAULT '0',
  `lang` text NOT NULL,
  `top` bigint(20) NOT NULL DEFAULT '0',
  `last_check` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `tag` text NOT NULL,
  `statuses_count` int(11) NOT NULL DEFAULT '0',
  `cursor` text NOT NULL,
  `last_cursor` text NOT NULL,
  `project` text NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4;


DROP TABLE IF EXISTS `twitter_tags`;
CREATE TABLE `twitter_tags` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tag` text NOT NULL,
  `tweet_id` bigint(20) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4;


DROP TABLE IF EXISTS `twitter_tweets`;
CREATE TABLE `twitter_tweets` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tweet_id` bigint(20) NOT NULL,
  `name` text NOT NULL,
  `display_name` text NOT NULL,
  `media` longtext NOT NULL,
  `full_text` longtext NOT NULL,
  `full_text_origin` longtext NOT NULL,
  `retweet_from` text NOT NULL,
  `translate` longtext NOT NULL,
  `time` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4;