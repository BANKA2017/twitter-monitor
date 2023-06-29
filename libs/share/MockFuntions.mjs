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

class MockDocument {
    globalBody = []
    constructor() {
        this.globalBody = []
        this.createElement('body')
    }
    createElement(tagName) {
        let children = []
        let newDom = {
            tagName,
            innerText: '',
            parentNode: '',
            get lastElementChild() {
                return this.children.length === 0 ? undefined : this.children[this.children.length - 1]
            },
            children,
            appendChild: (domHandle) => {
                domHandle.parentNode = newDom
            },
            removeChild: (_) => {}, //needn't
            setAttribute: (_, __) => {} //Mock needn't 'display:none;'
        }
        this.globalBody.push(newDom)
        return newDom
    }
    getElementsByTagName(tagName) {
        return this.globalBody.filter((x) => x.tagName === tagName)
    }
}

export { PregMatchAll, MockDocument }
