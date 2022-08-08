-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- 主机： localhost
-- 生成日期： 2022-08-02 09:23:21
-- 服务器版本： 8.0.29
-- PHP 版本： 8.0.21

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

--
-- 数据库： `tmv2`
--

-- --------------------------------------------------------

--
-- 表的结构 `tmp_twitter_data`
--

CREATE TABLE `tmp_twitter_data` (
  `uid` bigint NOT NULL DEFAULT '0',
  `name` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `display_name` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `following` int NOT NULL DEFAULT '0',
  `followers` int NOT NULL DEFAULT '0',
  `media_count` int NOT NULL DEFAULT '0',
  `statuses_count` int NOT NULL DEFAULT '0',
  `timestamp` int NOT NULL DEFAULT '0',
  `visible` tinyint NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=COMPRESSED;

-- --------------------------------------------------------

--
-- 表的结构 `twitter_data`
--

CREATE TABLE `twitter_data` (
  `id` bigint NOT NULL,
  `uid` bigint NOT NULL DEFAULT '0',
  `name` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `display_name` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `following` int NOT NULL DEFAULT '0',
  `followers` int NOT NULL DEFAULT '0',
  `media_count` int NOT NULL DEFAULT '0',
  `statuses_count` int NOT NULL DEFAULT '0',
  `timestamp` int NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=COMPRESSED;

-- --------------------------------------------------------

--
-- 表的结构 `v2_account_info`
--

CREATE TABLE `v2_account_info` (
  `id` int NOT NULL,
  `uid` bigint NOT NULL DEFAULT '0',
  `name` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `display_name` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `header` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `banner` int NOT NULL DEFAULT '0',
  `following` int NOT NULL DEFAULT '0',
  `followers` int NOT NULL DEFAULT '0',
  `media_count` int NOT NULL DEFAULT '0',
  `created_at` int NOT NULL,
  `description` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description_origin` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `verified` tinyint NOT NULL DEFAULT '0',
  `organization` tinyint NOT NULL DEFAULT '0',
  `top` bigint NOT NULL DEFAULT '0',
  `last_check` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `statuses_count` int NOT NULL DEFAULT '0',
  `cursor` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `last_cursor` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `deleted` tinyint NOT NULL DEFAULT '0',
  `locked` tinyint NOT NULL DEFAULT '0',
  `hidden` tinyint NOT NULL DEFAULT '0',
  `new` tinyint NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=COMPRESSED;

-- --------------------------------------------------------

--
-- 表的结构 `v2_config`
--

CREATE TABLE `v2_config` (
  `id` int NOT NULL,
  `data_origin` longtext NOT NULL,
  `data_output` longtext NOT NULL,
  `md5` char(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `timestamp` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- 表的结构 `v2_error_log`
--

CREATE TABLE `v2_error_log` (
  `id` bigint NOT NULL,
  `uid` bigint NOT NULL DEFAULT '0',
  `name` text,
  `code` bigint NOT NULL,
  `message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `timestamp` bigint NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- 表的结构 `v2_server_info`
--

CREATE TABLE `v2_server_info` (
  `id` bigint NOT NULL,
  `time` bigint NOT NULL,
  `microtime` bigint NOT NULL,
  `total_users` int NOT NULL,
  `total_tweets` int NOT NULL,
  `total_req_tweets` int NOT NULL,
  `total_throw_tweets` int NOT NULL,
  `total_req_times` int NOT NULL,
  `total_errors_count` int DEFAULT '0',
  `total_media_count` int NOT NULL,
  `total_time_cost` float NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=COMPACT;

-- --------------------------------------------------------

--
-- 表的结构 `v2_twitter_cards`
--

CREATE TABLE `v2_twitter_cards` (
  `id` bigint NOT NULL,
  `uid` bigint NOT NULL DEFAULT '0',
  `tweet_id` bigint NOT NULL DEFAULT '0',
  `title` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `vanity_url` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `type` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `secondly_type` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `url` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `media` tinyint NOT NULL DEFAULT '0',
  `unified_card_app` tinyint NOT NULL DEFAULT '0',
  `hidden` tinyint NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- 表的结构 `v2_twitter_card_app`
--

CREATE TABLE `v2_twitter_card_app` (
  `id` bigint NOT NULL,
  `tweet_id` bigint NOT NULL DEFAULT '0',
  `uid` bigint NOT NULL DEFAULT '0',
  `unified_card_type` text NOT NULL,
  `type` text NOT NULL,
  `appid` text NOT NULL,
  `country_code` text,
  `title` text NOT NULL,
  `category` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- 表的结构 `v2_twitter_entities`
--

CREATE TABLE `v2_twitter_entities` (
  `id` int NOT NULL,
  `uid` bigint NOT NULL DEFAULT '0',
  `tweet_id` bigint NOT NULL DEFAULT '0',
  `type` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `text` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT 'display_url or text',
  `expanded_url` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `url` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT 'origin twitter short url',
  `indices_start` int NOT NULL,
  `indices_end` int NOT NULL,
  `length` int NOT NULL,
  `timestamp` int NOT NULL DEFAULT '0',
  `hidden` tinyint NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- 表的结构 `v2_twitter_media`
--

CREATE TABLE `v2_twitter_media` (
  `id` bigint NOT NULL,
  `tweet_id` bigint NOT NULL DEFAULT '0',
  `uid` bigint NOT NULL DEFAULT '0',
  `cover` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `url` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `filename` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `basename` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `extension` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `content_type` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `bitrate` int NOT NULL,
  `origin_type` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `origin_info_width` int NOT NULL,
  `origin_info_height` int NOT NULL,
  `title` text COLLATE utf8mb4_general_ci,
  `description` text COLLATE utf8mb4_general_ci,
  `media_key` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `source` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `blurhash` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `deleted` tinyint DEFAULT '0',
  `hidden` tinyint NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC;

-- --------------------------------------------------------

--
-- 表的结构 `v2_twitter_polls`
--

CREATE TABLE `v2_twitter_polls` (
  `id` bigint NOT NULL,
  `uid` bigint NOT NULL DEFAULT '0',
  `tweet_id` bigint NOT NULL DEFAULT '0',
  `origin_tweet_id` bigint NOT NULL DEFAULT '0',
  `choice_label` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `poll_order` tinyint NOT NULL,
  `end_datetime` int NOT NULL,
  `count` int NOT NULL DEFAULT '0',
  `checked` tinyint NOT NULL DEFAULT '0',
  `hidden` tinyint NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- 表的结构 `v2_twitter_quote`
--

CREATE TABLE `v2_twitter_quote` (
  `id` bigint NOT NULL,
  `uid` bigint NOT NULL DEFAULT '0',
  `tweet_id` bigint NOT NULL DEFAULT '0',
  `name` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `display_name` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `full_text` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `full_text_origin` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `time` int NOT NULL DEFAULT '0',
  `media` tinyint NOT NULL DEFAULT '0',
  `video` tinyint NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- 表的结构 `v2_twitter_tweets`
--

CREATE TABLE `v2_twitter_tweets` (
  `id` int NOT NULL,
  `tweet_id` bigint NOT NULL,
  `origin_tweet_id` bigint NOT NULL DEFAULT '0',
  `conversation_id_str` bigint NOT NULL DEFAULT '0',
  `uid` bigint NOT NULL DEFAULT '0',
  `name` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `display_name` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `media` tinyint NOT NULL DEFAULT '0',
  `video` tinyint NOT NULL DEFAULT '0',
  `card` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `poll` tinyint NOT NULL DEFAULT '0',
  `quote_status` bigint NOT NULL DEFAULT '0',
  `source` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `full_text` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_text_origin` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `retweet_from` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `retweet_from_name` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `translate` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `translate_source` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `hidden` tinyint NOT NULL DEFAULT '0',
  `dispute` tinyint NOT NULL DEFAULT '0',
  `time` int NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=COMPRESSED;

--
-- 转储表的索引
--

--
-- 表的索引 `tmp_twitter_data`
--
ALTER TABLE `tmp_twitter_data`
  ADD PRIMARY KEY (`uid`),
  ADD KEY `uid` (`uid`);

--
-- 表的索引 `twitter_data`
--
ALTER TABLE `twitter_data`
  ADD PRIMARY KEY (`id`),
  ADD KEY `uid` (`uid`),
  ADD KEY `timestamp` (`timestamp`),
  ADD KEY `id` (`id`);

--
-- 表的索引 `v2_account_info`
--
ALTER TABLE `v2_account_info`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uid` (`uid`);

--
-- 表的索引 `v2_config`
--
ALTER TABLE `v2_config`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `id` (`id`);

--
-- 表的索引 `v2_error_log`
--
ALTER TABLE `v2_error_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `timestamp` (`timestamp`),
  ADD KEY `uid` (`uid`),
  ADD KEY `code` (`code`);

--
-- 表的索引 `v2_server_info`
--
ALTER TABLE `v2_server_info`
  ADD PRIMARY KEY (`id`),
  ADD KEY `time` (`time`),
  ADD KEY `microtime` (`microtime`);

--
-- 表的索引 `v2_twitter_cards`
--
ALTER TABLE `v2_twitter_cards`
  ADD PRIMARY KEY (`id`),
  ADD KEY `uid` (`uid`),
  ADD KEY `tweet_id` (`tweet_id`);

--
-- 表的索引 `v2_twitter_card_app`
--
ALTER TABLE `v2_twitter_card_app`
  ADD PRIMARY KEY (`id`),
  ADD KEY `tweet_id` (`tweet_id`),
  ADD KEY `uid` (`uid`);

--
-- 表的索引 `v2_twitter_entities`
--
ALTER TABLE `v2_twitter_entities`
  ADD PRIMARY KEY (`id`),
  ADD KEY `uid` (`uid`),
  ADD KEY `tweet_id` (`tweet_id`),
  ADD KEY `timestamp` (`timestamp`);

--
-- 表的索引 `v2_twitter_media`
--
ALTER TABLE `v2_twitter_media`
  ADD PRIMARY KEY (`id`),
  ADD KEY `tweet_id` (`tweet_id`),
  ADD KEY `uid` (`uid`);

--
-- 表的索引 `v2_twitter_polls`
--
ALTER TABLE `v2_twitter_polls`
  ADD PRIMARY KEY (`id`),
  ADD KEY `uid` (`uid`),
  ADD KEY `tweet_id` (`tweet_id`);

--
-- 表的索引 `v2_twitter_quote`
--
ALTER TABLE `v2_twitter_quote`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `tweet_id_2` (`tweet_id`),
  ADD KEY `uid` (`uid`),
  ADD KEY `tweet_id` (`tweet_id`);

--
-- 表的索引 `v2_twitter_tweets`
--
ALTER TABLE `v2_twitter_tweets`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `tweet_id` (`tweet_id`),
  ADD UNIQUE KEY `id` (`id`),
  ADD KEY `uid` (`uid`),
  ADD KEY `conversation_id_str` (`conversation_id_str`),
  ADD KEY `origin_tweet_id` (`origin_tweet_id`);
ALTER TABLE `v2_twitter_tweets` ADD FULLTEXT KEY `full_text_origin` (`full_text_origin`);

--
-- 在导出的表使用AUTO_INCREMENT
--

--
-- 使用表AUTO_INCREMENT `twitter_data`
--
ALTER TABLE `twitter_data`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- 使用表AUTO_INCREMENT `v2_account_info`
--
ALTER TABLE `v2_account_info`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- 使用表AUTO_INCREMENT `v2_config`
--
ALTER TABLE `v2_config`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- 使用表AUTO_INCREMENT `v2_error_log`
--
ALTER TABLE `v2_error_log`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- 使用表AUTO_INCREMENT `v2_server_info`
--
ALTER TABLE `v2_server_info`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- 使用表AUTO_INCREMENT `v2_twitter_cards`
--
ALTER TABLE `v2_twitter_cards`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- 使用表AUTO_INCREMENT `v2_twitter_card_app`
--
ALTER TABLE `v2_twitter_card_app`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- 使用表AUTO_INCREMENT `v2_twitter_entities`
--
ALTER TABLE `v2_twitter_entities`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- 使用表AUTO_INCREMENT `v2_twitter_media`
--
ALTER TABLE `v2_twitter_media`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- 使用表AUTO_INCREMENT `v2_twitter_polls`
--
ALTER TABLE `v2_twitter_polls`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- 使用表AUTO_INCREMENT `v2_twitter_quote`
--
ALTER TABLE `v2_twitter_quote`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- 使用表AUTO_INCREMENT `v2_twitter_tweets`
--
ALTER TABLE `v2_twitter_tweets`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;
COMMIT;
