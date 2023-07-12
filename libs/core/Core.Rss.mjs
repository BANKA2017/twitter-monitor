export class Rss {
    rss
    channelObject = {}
    itemArray = []

    channel(channelObject, addMode = false) {
        if (addMode) {
            this.channelObject = {...this.channelObject, ...channelObject}
        } else {
            this.channelObject = channelObject
        }
        return this
    }
    item(itemArray) {
        this.itemArray.push(itemArray)
        return this
    }
    get value() {
        this.rss = '<?xml version="1.0" encoding="UTF-8"?><?xml-stylesheet href="/static/xml/rss.xsl" type="text/xsl"?><rss xmlns:atom="http://www.w3.org/2005/Atom" version="2.0">'
        this.rss += '<channel>'
        this.rss += Object.keys(this.channelObject)
            .map((dom) => (this.channelObject[dom].cdata ? `<${dom}><![CDATA[${this.channelObject[dom].text}]]></${dom}>` : `<${dom}>${this.channelObject[dom].text}</${dom}>`))
            .join('')
        this.rss += this.itemArray
            .map(
                (item) =>
                    '<item>' +
                    Object.keys(item)
                        .map((dom) => (item[dom].cdata ? `<${dom}><![CDATA[${item[dom].text}]]></${dom}>` : `<${dom}>${item[dom].text}</${dom}>`))
                        .join('') +
                    '</item>'
            )
            .join('')
        this.rss += '</channel></rss>'
        return this.rss
    }
}
