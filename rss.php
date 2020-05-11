<?php
/* Class rss
 * @banka2017 & KD·NETWORK
 * v1
 */
//TODO rewrite
namespace Tmv2\Rss;
class Rss {
    public $rss, $channelArray, $itemArray;
    public function build () :string {
        $this->rss = '<?xml version="1.0" encoding="UTF-8"?><rss xmlns:atom="http://www.w3.org/2005/Atom" version="2.0">';
        $this->rss .= '<channel>';
        foreach ($this->channelArray as $dom => $domItem) {
            $this->rss .= $domItem["cdata"] ? "<{$dom}><![CDATA[{$domItem["text"]}]]></{$dom}>" : "<{$dom}>{$domItem["text"]}</{$dom}>";
        }
        foreach ($this->itemArray as $item) {
            $this->rss .= '<item>';
            foreach ($item as $dom => $domItem) {
                $this->rss .= $domItem["cdata"] ? "<{$dom}><![CDATA[{$domItem["text"]}]]></{$dom}>" : "<{$dom}>{$domItem["text"]}</{$dom}>";
            }
            $this->rss .= '</item>';
        }
        $this->rss .= "</channel></rss>";
        return $this->rss;
    }
    public function channel (array $channelArray) {
        $this->channelArray = $channelArray;
        return $this;
    }
    public function item (array $itemArray) {
        $this->itemArray[] = $itemArray;
        return $this;
    }
}