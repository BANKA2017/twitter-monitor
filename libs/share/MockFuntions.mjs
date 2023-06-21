const PregMatchAll = (regex = new RegExp('', 'gm'), text = '') => {
    let handle
    let match = []

    while ((handle = regex.exec(text)) !== null) {
        // This is necessary to avoid infinite loops with zero-width matches
        if (handle.index === regex.lastIndex) {
            regex.lastIndex++
        }
        for (const index in handle) {
            if (!isNaN(index)) {
                if (!match[index]) {
                    match[index] = []
                }
                match[index].push(handle[index])
            }
        }
    }
    return match
}

export { PregMatchAll }
