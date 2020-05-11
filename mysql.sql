SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";
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
CREATE TABLE `v2_server_info` (
  `id` bigint NOT NULL,
  `time` int NOT NULL,
  `microtime` float NOT NULL,
  `total_users` int NOT NULL,
  `total_tweets` int NOT NULL,
  `total_req_tweets` int NOT NULL,
  `total_throw_tweets` int NOT NULL,
  `total_req_times` int NOT NULL,
  `total_media_count` int NOT NULL,
  `total_time_cost` float NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ROW_FORMAT=COMPACT;
CREATE TABLE `v2_twitter_cards` (
  `id` bigint NOT NULL,
  `uid` bigint NOT NULL DEFAULT '0',
  `tweet_id` bigint NOT NULL DEFAULT '0',
  `title` text CHARACTER SET utf8mb4 COLLATE utf8mb4_is_0900_ai_ci,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_is_0900_ai_ci,
  `vanity_url` text CHARACTER SET utf8mb4 COLLATE utf8mb4_is_0900_ai_ci,
  `type` text CHARACTER SET utf8mb4 COLLATE utf8mb4_is_0900_ai_ci,
  `url` text CHARACTER SET utf8mb4 COLLATE utf8mb4_is_0900_ai_ci,
  `media` tinyint NOT NULL DEFAULT '0',
  `hidden` tinyint NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_is_0900_ai_ci;
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
  `hidden` tinyint NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
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
  `media_key` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `source` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `hidden` tinyint NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=COMPACT;
CREATE TABLE `v2_twitter_polls` (
  `id` bigint NOT NULL,
  `uid` bigint NOT NULL DEFAULT '0',
  `tweet_id` bigint NOT NULL DEFAULT '0',
  `origin_tweet_id` bigint NOT NULL DEFAULT '0',
  `choice_label` text CHARACTER SET utf8mb4 COLLATE utf8mb4_is_0900_ai_ci NOT NULL,
  `poll_order` tinyint NOT NULL,
  `end_datetime` int NOT NULL,
  `count` int NOT NULL DEFAULT '0',
  `checked` tinyint NOT NULL DEFAULT '0',
  `hidden` tinyint NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_is_0900_ai_ci;
CREATE TABLE `v2_twitter_quote` (
  `id` bigint NOT NULL,
  `uid` bigint NOT NULL DEFAULT '0',
  `tweet_id` bigint NOT NULL DEFAULT '0',
  `name` text CHARACTER SET utf8mb4 COLLATE utf8mb4_is_0900_ai_ci,
  `display_name` text CHARACTER SET utf8mb4 COLLATE utf8mb4_is_0900_ai_ci,
  `full_text` text CHARACTER SET utf8mb4 COLLATE utf8mb4_is_0900_ai_ci,
  `full_text_origin` text CHARACTER SET utf8mb4 COLLATE utf8mb4_is_0900_ai_ci,
  `time` int NOT NULL DEFAULT '0',
  `media` tinyint NOT NULL DEFAULT '0',
  `video` tinyint NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_is_0900_ai_ci;
CREATE TABLE `v2_twitter_tweets` (
  `id` int NOT NULL,
  `tweet_id` bigint NOT NULL,
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
  `time` int NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=COMPRESSED;
ALTER TABLE `twitter_data`
  ADD PRIMARY KEY (`id`),
  ADD KEY `uid` (`uid`);
ALTER TABLE `v2_account_info`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uid` (`uid`);
ALTER TABLE `v2_server_info`
  ADD PRIMARY KEY (`id`);
ALTER TABLE `v2_twitter_cards`
  ADD PRIMARY KEY (`id`),
  ADD KEY `uid` (`uid`),
  ADD KEY `tweet_id` (`tweet_id`);
ALTER TABLE `v2_twitter_entities`
  ADD PRIMARY KEY (`id`),
  ADD KEY `uid` (`uid`),
  ADD KEY `tweet_id` (`tweet_id`);
ALTER TABLE `v2_twitter_media`
  ADD PRIMARY KEY (`id`),
  ADD KEY `tweet_id` (`tweet_id`),
  ADD KEY `uid` (`uid`);
ALTER TABLE `v2_twitter_polls`
  ADD PRIMARY KEY (`id`),
  ADD KEY `uid` (`uid`),
  ADD KEY `tweet_id` (`tweet_id`);
ALTER TABLE `v2_twitter_quote`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `tweet_id_2` (`tweet_id`),
  ADD KEY `uid` (`uid`),
  ADD KEY `tweet_id` (`tweet_id`);
ALTER TABLE `v2_twitter_tweets`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `tweet_id` (`tweet_id`),
  ADD UNIQUE KEY `id` (`id`),
  ADD KEY `uid` (`uid`);
ALTER TABLE `twitter_data`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;
ALTER TABLE `v2_account_info`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;
ALTER TABLE `v2_server_info`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;
ALTER TABLE `v2_twitter_cards`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;
ALTER TABLE `v2_twitter_entities`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;
ALTER TABLE `v2_twitter_media`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;
ALTER TABLE `v2_twitter_polls`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;
ALTER TABLE `v2_twitter_quote`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;
ALTER TABLE `v2_twitter_tweets`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;
COMMIT;
