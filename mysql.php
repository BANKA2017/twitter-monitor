<?php
/* Class ssql
 * @banka2017 & KD·NETWORK
 * v5.4
 */
class ssql{
    public $conn;

    public function __construct($servername, $username, $password, $dbname) {
        $this->conn = new mysqli($servername, $username, $password, $dbname);
        // 检测连接
        if ($this->conn->connect_error) {
            throw new Exception("连接失败: " . $this->conn->connect_error . "\n");
        }
        mysqli_options($this->conn, MYSQLI_OPT_INT_AND_FLOAT_NATIVE, true);
    }

    public function returnQuery(string $sql, bool $multi = false, bool $singleMulti = false){
        $result = $multi && !$singleMulti ? $this->conn->multi_query($sql) : $this->conn->query($sql);
        $returnArray = [];
        if (!$result){
            throw new Exception("Error: " . $sql . $this->conn->error . "\n");
        } elseif ($multi && !$singleMulti){
            do {
                /* store first result set */
                if ($result = $this->conn->store_result(MYSQLI_STORE_RESULT_COPY_DATA)) {
                    while ($row = $result->fetch_row()) {
                        $returnArray[] = $row;
                    }
                    $result->free();
                }
            } while ($this->conn->next_result());
        } elseif($result === TRUE) {
            return true;
        } elseif ($result->num_rows) {
            while ($row = $result->fetch_assoc()) {
                $returnArray[] = $row;
            }
        }
        return $returnArray;
    }

    public function load(string $table, array $keys = ["*"], array $where = [], array $orders = [], int $limit = 0, bool $desc = false, int $offset = 0, $returnRawSql = false) {
        $activeOr = false;
        $sql = "SELECT DISTINCT";
        for ($x = 0; $x < count($keys); $x++) {
            if ($x > 0) {
                $sql .= ',';
            }
            $sql .= $keys[$x] == '*' ? ' * ' : ' `' . mysqli_real_escape_string($this->conn, $keys[$x]) . '`';
        }
        $sql .= " FROM `" . mysqli_real_escape_string($this->conn, $table) . "`";
        if ($where != []) {
            $sql .= ' WHERE';
            for ($x = 0; $x < count($where); $x++) {
                if(isset($where[$x][3]) && strtoupper($where[$x][3]) == "OR" && !$activeOr){
                    $sql .= ' ( ';
                    $activeOr = true;
                }
                if ($x > 0) {
                    if(isset($where[$x][3]) && strtoupper($where[$x][3]) == "OR"){
                        $sql .= ' OR ';
                    }else{
                        $sql .= ' AND ';
                    }
                }
                switch (strtoupper($where[$x][1])) {
                    case "LIKE%%":
                        $sql .= ' `' . mysqli_real_escape_string($this->conn, $where[$x][0]) . '` LIKE "%' . mysqli_real_escape_string($this->conn, $where[$x][2]) . '%"';
                        break;
                    case "MATCH":
                        $sql .= ' MATCH(`' . mysqli_real_escape_string($this->conn, $where[$x][0]) . '`) AGAINST("' . mysqli_real_escape_string($this->conn, $where[$x][2]) . '")';
                        break;
                    default:
                        $sql .= ' `' . mysqli_real_escape_string($this->conn, $where[$x][0]) . '` ' . mysqli_real_escape_string($this->conn, $where[$x][1]) . ' "' . mysqli_real_escape_string($this->conn, $where[$x][2]) . '"';
                }
                if((($x < count($where) - 1 && strtoupper($where[$x + 1][3] ?? null) != 'OR') || $x == count($where) - 1) && $activeOr){
                    $sql .= ' ) ';
                    $activeOr = false;
                }
            } 
        }
        if ($orders != []) {
            $sql .= ' ORDER BY';
            for ($x = 0; $x < count($orders); $x++) {
                if ($x > 0) {
                    $sql .= ',';
                }
                $rOrder = mysqli_real_escape_string($this->conn, $desc ? $orders[$x][0] : $orders[$x]);
                $sql .= $rOrder ? ' `' . $rOrder . '`' : '';
                //TODO 尝试兼容前提下自主修改本句
                if($desc && $orders[$x][1]){
                    $sql .= ' DESC';
                }
            }
        }
        if($limit){
            $sql .= " LIMIT {$limit}";
        }
        if ($offset) {
            $sql .= " OFFSET {$offset}";
        }
        $sql .= ";";
        return $returnRawSql ? $sql : self::returnQuery($sql);
    }

    public function update(string $table, array $set = [], array $where = [], bool $returnRawSql = false) {
        $sql = "UPDATE `{$table}` SET";
        foreach ($set as $key => $value) {
            $sql .= " `" . mysqli_real_escape_string($this->conn, $key) . "` = '" . mysqli_real_escape_string($this->conn, $value) . "',";
        }
        $sql = substr($sql, 0, strlen($sql) - 1);
        if ($where != []) {
            $sql .= " WHERE (";
            foreach ($where as $x => $value) {
                $sql .= " (`" . mysqli_real_escape_string($this->conn, $value[0]) . "` " . mysqli_real_escape_string($this->conn, $value[1]) . " '" . mysqli_real_escape_string($this->conn, $value[2]) . "') ";
                if(isset($where[$x][3]) && strtoupper($where[$x][3]) == "OR"){
                    $sql .= ' OR ';
                }else{
                    $sql .= ' AND ';
                }
            }
            $sql = substr($sql, 0, strlen($sql) - 4) . ");";
        }
        return $returnRawSql ? $sql : self::returnQuery($sql);
    }

    public function insert(string $table, array $values = [], bool $returnRawSql = false, array $updateWhileExists = []) {
        $sql = "INSERT IGNORE INTO `" . mysqli_real_escape_string($this->conn, $table) . "` ";
        $x = 0;
        $d = '(';
        $e = '(';
        foreach ($values as $key => $value) {
            if ($x > 0) {
                $d .= ',';
                $e .= ',';
            }
            $d .= "`" . mysqli_real_escape_string($this->conn, $key) . "`";
            $e .= "'" . mysqli_real_escape_string($this->conn, $value) . "'";
            $x++;
        }
        $d .= ')';
        $e .= ')';
        $sql .= $d . " VALUES " . $e;
        if ($updateWhileExists) {
            $x = 0;
            $sql .= " ON DUPLICATE KEY UPDATE ";
            foreach ($updateWhileExists as $key => $value) {
                if ($x > 0) {
                    $sql .= ',';
                }
                $sql .= " `" . mysqli_real_escape_string($this->conn, $key) . "` = '" . mysqli_real_escape_string($this->conn, $value) . "'";
                $x++;
            }
        } else {
            $sql .= ";";
        }
        return $returnRawSql ? $sql : self::returnQuery($sql);
    }

    public function switch_db (string $dbname) {
        $this->conn->select_db($dbname);
    }

    //警告: 此函数会删除数据, 请谨慎调用
    public function _delete(string $table, array $where = [], bool $returnRawSql = false) {
        $activeOr = false;
        $sql = "DELETE FROM `" . mysqli_real_escape_string($this->conn, $table) . "` WHERE ";
        for ($x = 0; $x < count($where); $x++) {
            if(isset($where[$x][3]) && strtoupper($where[$x][3]) == "OR" && !$activeOr){
                $sql .= ' ( ';
                $activeOr = true;
            }
            if ($x > 0) {
                if(isset($where[$x][3]) && strtoupper($where[$x][3]) == "OR"){
                    $sql .= ' OR ';
                }else{
                    $sql .= ' AND ';
                }
            }
            if(strtoupper($where[$x][1]) != 'LIKE%%'){
                $sql .= ' `' . mysqli_real_escape_string($this->conn, $where[$x][0]) . '` ' . mysqli_real_escape_string($this->conn, $where[$x][1]) . ' "' . mysqli_real_escape_string($this->conn, $where[$x][2]) . '"';
            }else{
                $sql .= ' `' . mysqli_real_escape_string($this->conn, $where[$x][0]) . '` LIKE "%' . mysqli_real_escape_string($this->conn, $where[$x][2]) . '%"';
            }
            if((($x < count($where) - 1 && strtoupper($where[$x + 1][3] ?? null) != 'OR') || $x == count($where) - 1) && $activeOr){
                $sql .= ' ) ';
                $activeOr = false;
            }
        }
        $sql .= ";";
        return $returnRawSql ? $sql : self::returnQuery($sql);
    }
    //警告: 此函数不会验证输入数据，禁止用于运行未知来源数据
    public function multi(string $sql, bool $singleMulti = false) {
        return self::returnQuery($sql, true, $singleMulti);
    }

    //public function __destruct() {
    //    unset($this->returnArray);
    //}
}
