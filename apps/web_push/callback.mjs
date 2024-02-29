const callback = async (dataObject, ...otherArgs) => {
    // do anything with the data
    // save...
    globalThis._config.tweets.push(dataObject)
    globalThis._config.saveTweets()
    // --- or ---
    // post to another endpoint...
    // await fetch('your-endpoint', {
    //     method: 'POST',
    //     headers: {
    //         'Content-Type': 'application/json'
    //     },
    //     body: JSON.stringify(dataObject)
    // })
    // --- or ---
    // fetch more info from twitter...
    // const tweetInfo = await (await fetch('https://cdn.syndication.twimg.com/tweet-result?id=' + dataObject.tag.replace(/[^\d]+\-/gm, '') + '&token=0')).json()
    // console.log(tweetInfo)
}

export default callback
