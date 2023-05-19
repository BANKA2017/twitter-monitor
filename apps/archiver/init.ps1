# NOT SUPPORTED JAPANESE OR KOREAN WINDOWS
# REPLACE \ TO ¥(JAPANESE) OR ₩(KOREAN), MAYBE...

$save_path='twitter_archiver'
$pwd_string=$pwd.Path
if ($args.Count -ge 1) {
    $save_path=$($args[0])
    Write-Output "Use new path $pwd_string\$save_path"
} else {
    Write-Output "No save_path, use default path $pwd_string\$save_path"
}
if (Test-Path "$pwd_string\$save_path") {
    Write-Output "Path $pwd_string\$save_path already exists, please rename or remove it."
} else {
    New-Item -Path $pwd_string -Name $save_path -ItemType "directory"
    New-Item -Path "$pwd_string\$save_path" -Name "rawdata" -ItemType "directory"
    New-Item -Path "$pwd_string\$save_path" -Name "savedata" -ItemType "directory"
    New-Item -Path "$pwd_string\$save_path" -Name "savemedia" -ItemType "directory"

    # active directory
    "$save_path" | Out-File -FilePath "$pwd_string\screen_name.txt" -NoNewline
}