export class Rss {
    rss
    channelObject = {}
    itemArray = []

    channel(channelObject, addMode = false) {
        if (addMode) {
            this.channelObject = { ...this.channelObject, ...channelObject }
        } else {
            this.channelObject = channelObject
        }
        return this
    }
    item(itemArray) {
        this.itemArray.push(itemArray)
        return this
    }
    obj2dom(obj) {
        return Object.keys(obj)
            .map((dom) => (obj[dom].cdata ? `<${dom}><![CDATA[${obj[dom].text}]]></${dom}>` : `<${dom}>${obj[dom].text instanceof Object ? this.obj2dom(obj[dom].text) : obj[dom].text}</${dom}>`))
            .join('')
    }
    get value() {
        this.rss = '<?xml version="1.0" encoding="UTF-8"?><?xml-stylesheet href="/static/xml/rss.xsl" type="text/xsl"?><rss xmlns:atom="http://www.w3.org/2005/Atom" version="2.0">'
        this.rss += '<channel>'
        this.rss += this.obj2dom(this.channelObject)
        this.rss += this.itemArray.map((item) => '<item>' + this.obj2dom(item) + '</item>').join('')
        this.rss += '</channel></rss>'
        return this.rss
    }
}
