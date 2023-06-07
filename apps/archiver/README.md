Archiver()
---

## ⚠ WARNING

- We cannot guarantee that these features will be available.
- When archiving someone else's Twitter, please obtain their permission first.
- The structure of the generated data is still being adjusted, and the current results may not be available in viewer.

## Known issues
- Unable to crawl most of the retweets.
- Unable to crawl tweets marked as sensitive content (TODO login can solve).
- Unable to crawl copyrighted media files in some region.
- Some videos are damaged, which is normal. Downloading the corresponding m3u8 will result in a lower quality version. 
- Unable to crawl tweets from protected/banned/deleted users. 
- The rate limit status after logging in will follow the account rather than the guest token (TODO not implemented yet).
- FFmpeg script couldn't skip contents exist.

## Features

- Userinfo (not included the author of the quoted tweet).
- Tweets and replies can be searched anonymously, not included most retweets.
- Polls
- Avatar, banner, photos and videos.
- Following and followers list (optional)
- Keep raw data for future used.
- Build ffmpeg command for downloading broadcast or audiospace content
- Update timeline while cursor value is **complete**

## TODO

- Download Space and Broadcast with js
- Login by **COOKIE**

## Init

- Execute command:

  ```shell
  #bash
  bash init.sh <screen_name> # like 'twitter'
  #or powershell
  .\init.ps1 <screen_name>
  ```

  A folder named `screen_name` will be created. If the folder `screen_name` already exists, you will be prompted to delete or rename the folder.

## Run

### Crawler

```shell
node archive.mjs [OPTION]
```
|Parameter|Required|Description|
|:--|:--|:--|
|--all|Optional|All data (UserInfo, Tweets, Following, Followers)|
|--followers|Optional|Get Followers|
|--following|Optional|Get Following|
|--media|Optional|Get Media|
|--broadcast|Optional|Generate script to download broadcast video|
|--space|Optional|Generate script to download space audio|
|--skip_\<key of argvList \>|Optional|Key of argvList included `tweet`, `followers`, `following`, `media`, `broadcast` and `space`. Will skip the corresponding job.|

- Default values, only crawl timeline without any media:
  ```javascript
  activeFlags = {
      tweet: true,
      followers: false, 
      following: false,
      media: false,
      broadcast: false,
      space: false,
  }
  ```

- If both activate and skip options exist, it will skip.

### Retry media

```shell
node retryMedia.mjs
```

Attempt to retrieve the failed images during crawling. (useless)

## View

Online viewer: <https://twitter-archive-viewer.vercel.app/>

The front-end project is currently under development and if it is ready, it might be available in <https://github.com/BANKA2017/twitter-archive-viewer>.
