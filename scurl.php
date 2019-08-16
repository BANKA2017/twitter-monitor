<?php
/* Class scurl
 * @banka2017 & KD·NETWORK
 * v5.0
 */
class sscurl{
    public $ch, $url, $user_agent, $others, $type, $data, $target, $fp, $options;
    public function __construct($url = null, $type = 'GET', $head = [], $user_agent = 3, $data = null, $target = ""){
        if(!function_exists('curl_init') || $url == null){
            throw new Exception('unable to use scurl');
        }
        if(is_file($url)){
            $this -> ch = file_get_contents($url);
        }else{
            $this -> ch = curl_init();
            $this -> setup($url);
            if($target){
                $this -> target = $target;
                if(!($this -> fp = fopen($target, "w"))){
                    throw new Exception("unable open the file {$target}");
                }else{
                    $this -> saveAsFile();
                }
            }
            $this -> setHeader($head) -> setUseragent($user_agent) -> post($type, $data);
        }
    }
    public function __toString(){
        if(is_string($this -> ch)){
            return $this -> ch;
        }
        if(is_string($r = $this -> exec())){
            return $r;
        }elseif(!$this -> target){
            echo "KDscurl: Could not receive a string value!\n";
            return "";
        }else{
            echo "KDscurl: File is save to {$this -> target}\n";
            return "1";
        }
    }
    public function setup($url, $returntransfer = true, $timeout = 10){
        $this -> options = [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => $returntransfer,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_TIMEOUT => $timeout,
        ];
        return $this;
    }
    public function saveAsFile(){
        $this -> options[CURLOPT_FILE] = $this -> fp;
        return $this;
    }
    public function post($type, $data){
        $type = strtoupper($type);
        if($type != 'GET'){
            if($type == 'POST'){
                $this -> options[CURLOPT_POST] = true;
            }else{
                $this -> options[CURLOPT_CUSTOMREQUEST] = $type;
            }
            if($data != null){
                $this -> options[CURLOPT_POSTFIELDS] = $data;
            }
        }
        return $this;
    }
    //public function buildFields($data){
    //    curl_setopt($this -> ch,CURLOPT_POSTFIELDS,$data);
    //    return $this;
    //}
    public function returnBody($a = -1){
        switch($a){
            case 0:
                $b = true;
                $c = false;
                break;
            case 1:
                $b = false;
                $c = true;
                break;
            case 2:
                $b = true;
                $c = true;
                break;
            default:
                $b = false;
                $c = false;
        }
        $this -> options[CURLOPT_HEADER] = $b;
        $this -> options[CURLOPT_NOBODY] = $c;
        return $this;
    }
    public function setUseragent($ua){
        switch($ua){
            case 1:
                $ua = 'Mozilla/5.0 (Linux; Android 8.0.0; Pixel 2 XL Build/OPD1.170816.004) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Mobile Safari/537.36';
                break;
            case 2:
                $ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1';
                break;
            case 3:
                $ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.131 Safari/537.36';
                break;
        }
        if($ua != ""){
            $this -> options[CURLOPT_USERAGENT] = $ua;
        }
        return $this;
    }
    public function setHeader($head){
        if(is_array($head) && $head != []){
            $this -> options[CURLOPT_HTTPHEADER] = $head;
        }
        return $this;
    }
    public function getHttpCode(){
        return curl_getinfo($this -> ch,CURLINFO_HTTP_CODE);
    }
    public function exec(){
        curl_setopt_array($this -> ch, $this -> options);
        return curl_exec($this -> ch);
    }
    public function __destruct() {
        if(!is_string($this -> ch)){
            curl_close($this -> ch);
            if($this -> fp){
                fclose($this -> fp);
            }
        }
    }
}