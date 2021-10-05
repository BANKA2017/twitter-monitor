<?php
/* Class scurl
 * @banka2017 & KDNETWORK
 * v6.0.0
 */
class sscurl{
    public $type, $data, $fp, $options;
    public string $target;
    public string|false|CurlHandle $ch;
    private CurlMultiHandle $multiHandle;
    private bool $multiCurl;
    private array $multiHandleList;

    /**
     * @throws Exception
     */
    public function __construct(string|array $url = '', string $type = 'GET', array $head = [], int|string $user_agent = 3, mixed $data = null, string $target = ""){
        $this->multiCurl = is_array($url);
        $this->target = $target;
        if(!function_exists('curl_init') || !$url){
            throw new Exception('unable to use scurl');
        }
        if(!$this->multiCurl && is_file($url)){
            $this->ch = file_get_contents($url);
        } else{
            if ($this->multiCurl) {
                $this->multiHandle = curl_multi_init();
                $this->multiHandleList = [];
                foreach ($url as $singleUrl) {
                    $this->ch = curl_init();
                    $this->setup($singleUrl)->setHeader($head)->setUserAgent($user_agent)->post($type, $data);
                    curl_setopt_array($this->ch, $this->options);
                    curl_multi_add_handle($this->multiHandle, $this->ch);
                    $this->multiHandleList[] = $this->ch;
                }
            } else {
                $this->ch = curl_init();
                $this->setup($url);
                if($this->target){
                    if(!($this->fp = fopen($target, "w"))){
                        throw new Exception("unable open the file $target");
                    }else{
                        $this->saveAsFile();
                    }
                }
                $this->setHeader($head)->setUserAgent($user_agent)->post($type, $data)->addProxy("http://192.168.123.154", "1081");
            }

        }
    }
    public function __toString(){
        if(is_string($this->ch)){
            return $this->ch;
        }
        if(is_string($r = $this->exec())){
            return $r;
        }elseif(!$this->target){
            //echo "KDscurl: Could not receive a string value!\n";
            return "";
        }else{
            //echo "KDscurl: File is save to {$this->target}\n";
            return "1";
        }
    }
    public function returnMultiCurlContent (bool $toArray = false):array {
        $tmpContentArray = [];
        do {
            //usleep(10000);
            curl_multi_exec($this->multiHandle,$running);
        } while ($running > 0);
        foreach ($this->multiHandleList as $this->ch) {
            $tmpContentArray[] = $toArray ? json_decode(curl_multi_getcontent($this->ch), true) : curl_multi_getcontent($this->ch);
            curl_multi_remove_handle($this->multiHandle, $this->ch);
        }
        curl_multi_close($this->multiHandle);
        return $tmpContentArray;
    }
    public function setup(string $url): self{
        $this->options = [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_TIMEOUT => 10
        ];
        return $this;
    }
    public function addProxy ($proxy, $proxyPort, $type = CURLPROXY_HTTP): self {
        $this->options[CURLOPT_PROXYTYPE] = $type;//CURLPROXY_HTTP CURLPROXY_SOCKS5
        $this->options[CURLOPT_PROXY] = $proxy;//"http://127.0.0.1",//socks5://bob:marley@localhost:12345
        $this->options[CURLOPT_PROXYPORT] = $proxyPort;//1081
        return $this;
    }
    public function upLoad ($fileName): self {
        if (!file_exists($fileName)) {
            $this->close();//no such file
        } else {
            $data = ['file' => new CURLFile(realpath($fileName))];
            $this->options[CURLOPT_POSTFIELDS] = isset($this->options[CURLOPT_POSTFIELDS]) ? array_merge($this->options[CURLOPT_POSTFIELDS], $data) : $data;
        }
        return $this;
    }
    public function addMore($add = []): self {
        foreach($add as $optionKey => $optionValue){
            $this->options[$optionKey] = $optionValue;
        }
        return $this;
    }
    public function gzip(): self{
        $this->options[CURLOPT_ENCODING] = "gzip";
        return $this;
    }
    public function saveAsFile(): self{
        $this->options[CURLOPT_FILE] = $this->fp;
        return $this;
    }
    public function post($type, $data): self{
        $type = strtoupper($type);
        if($type != 'GET'){
            if($type == 'POST'){
                $this->options[CURLOPT_POST] = true;
            }else{
                $this->options[CURLOPT_CUSTOMREQUEST] = $type;
            }
            if($data != null){
                $this->options[CURLOPT_POSTFIELDS] = isset($this->options[CURLOPT_POSTFIELDS]) ? array_merge($this->options[CURLOPT_POSTFIELDS], $data) : $data;
            }
        }
        return $this;
    }
    //public function buildFields($data){
    //    curl_setopt($this->ch,CURLOPT_POSTFIELDS,$data);
    //    return $this;
    //}
    public function returnBody($a = -1){
        $this->options[CURLOPT_HEADER] = ($a === 0 || $a === 2);
        $this->options[CURLOPT_NOBODY] = ($a === 1 || $a === 2);
        return $this;
    }
    public function setUserAgent($ua): self{
        $ua = match ($ua) {
            1 => 'Mozilla/5.0 (Linux; Android 8.0.0; Pixel 2 XL Build/OPD1.170816.004) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Mobile Safari/537.36',
            2 => 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
            3 => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.102 Safari/537.36',
            default => $ua,
        };
        if($ua != ""){
            $this->options[CURLOPT_USERAGENT] = $ua;
        }
        return $this;
    }
    public function setHeader($head): self{
        if(is_array($head) && $head != []){
            $this->options[CURLOPT_HTTPHEADER] = $head;
        }
        return $this;
    }
    public function getHttpCode(){
        return curl_getinfo($this->ch,CURLINFO_HTTP_CODE);
    }
    public function exec(): string|bool {
        curl_setopt_array($this->ch, $this->options);
        return curl_exec($this->ch);
    }
    public function close(){
        curl_close($this->ch);
    }
    public function header_body(): array {
        //header and body
        $response = $this->exec();
        $headerSize = curl_getinfo($this->ch, CURLINFO_HEADER_SIZE);
        return [substr($response, 0, $headerSize), substr($response, $headerSize)];
    }
    public function __destruct() {
        if(!is_string($this->ch)){
            //curl_close($this->ch);//提高效率
            if($this->fp){
                fclose($this->fp);
            }
        }
    }
}