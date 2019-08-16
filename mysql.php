<?php

class ssql{
    public $conn;

    /**
     * ssql constructor.
     * @param $servername
     * @param $username
     * @param $password
     * @param $dbname
     * @throws Exception
     */
    public function __construct($servername, $username, $password, $dbname) {
        $this->conn = new mysqli($servername, $username, $password, $dbname);
        // 检测连接
        if ($this->conn->connect_error) {
            throw new Exception("连接失败: " . $this->conn->connect_error . "\n");
        }
    }

    /**
     * @param $table
     * @param array $keys
     * @param array $where
     * @param array $orders
     * @return array
     */
    public function load($table, $keys = ["*"], $where = [], $orders = [], $limit = 0) {
        $sql = "SELECT";
        for ($x = 0; $x < count($keys); $x++) {
            if ($x > 0) {
                $sql .= ',';
            }
            $sql .= ' `' . mysqli_real_escape_string($this->conn, $keys[$x]) . '`';
        }
        $sql .= " FROM `" . mysqli_real_escape_string($this->conn, $table) . "`";
        if ($where != []) {
            $sql .= ' WHERE';
            for ($x = 0; $x < count($where); $x++) {
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
            }
        }
        if ($orders != []) {
            $sql .= ' ORDER BY';
            for ($x = 0; $x < count($orders); $x++) {
                if ($x > 0) {
                    $sql .= ',';
                }
                $sql .= ' `' . mysqli_real_escape_string($this->conn, $orders[$x]) . '`';
            }
            $sql .= ' DESC';
        }
        if($limit){
            $sql .= " LIMIT {$limit}";
        }
        $sql .= ";";
        $result = $this->conn->query($sql);
        if ($result->num_rows) {
            $a = [];
            while ($row = $result->fetch_assoc()) {
                $a[] = $row;
            }
        } else {
            $a = [];
        }
        return $a;
    }

    /**
     * @param $table
     * @param array $set
     * @param array $where
     * @return bool
     */
    public function update($table, $set = [], $where = []) {
        $sql = "UPDATE `{$table}` SET";
        foreach ($set as $key => $value) {
            $sql .= " `" . mysqli_real_escape_string($this->conn, $key) . "` = '" . mysqli_real_escape_string($this->conn, $value) . "',";
        }
        $sql = substr($sql, 0, strlen($sql) - 1);
        if ($where != []) {
            $sql .= " WHERE (";
            foreach ($where as $value) {
                $sql .= " (`" . mysqli_real_escape_string($this->conn, $value[0]) . "` " . mysqli_real_escape_string($this->conn, $value[1]) . " '" . mysqli_real_escape_string($this->conn, $value[2]) . "') OR";
            }
            $sql = substr($sql, 0, strlen($sql) - 3) . ");";
        }
        if ($this->conn->query($sql) === true) {
            return true;
        } else {
            echo "Error: " . $sql . $this->conn->error . "\n";
            return false;
        }
    }

    /**
     * @param $table
     * @param array $values
     * @return bool
     */
    public function inset($table, $values = []) {
        $sql = "INSERT INTO `" . mysqli_real_escape_string($this->conn, $table) . "` ";
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
        $sql .= $d . " VALUES " . $e . ";";
        if ($this->conn->query($sql) === TRUE) {
            return true;
        } else {
            echo "Error: " . $sql . $this->conn->error . "\n";
            return false;
        }
    }

    /**
     * @param $sql
     */
    //警告！此函数不会验证输入数据，禁止用于运行未知来源数据
    public function multi($sql) {
        if ($this->conn->multi_query($sql) != TRUE) {
            echo("Error: " . $sql . $this->conn->error . "\n");
        }
        do {
            if ($res = $this->conn->store_result()) {
                $res->free();
            }
        } while ($this->conn->more_results() && $this->conn->next_result());
    }
}