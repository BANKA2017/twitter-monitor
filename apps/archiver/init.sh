save_path='twitter_archiver'
pwd=`pwd`
if [ $# -ge 1 ]
then
    save_path=$1
    echo "Use new path" ${pwd}/${save_path}
else
    echo "No save_path, use default path" ${pwd}/${save_path}
fi
if [ -e ${pwd}/${save_path} ]
then
    echo "Path" ${pwd}/${save_path} "already exists, please rename or remove it."
else
    mkdir ${pwd}/${save_path}
    mkdir ${pwd}/${save_path}/rawdata
    mkdir ${pwd}/${save_path}/savedata
    mkdir ${pwd}/${save_path}/savemedia
    mkdir ${pwd}/${save_path}/scripts

    # active directory
    echo $save_path > ${pwd}/screen_name.txt
fi
