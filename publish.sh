# 将dist文件夹同步到服务器目录
# 上传公钥过去 ssh-copy-id -i ~/.ssh/id_rsa.pub root@x.x.x.x
host=root@8.148.195.54
project_path=adq-audience

rsync -avz --delete ./server-linux-x64 .env.production ecosystem.config.js $host:~/$project_path/

rsync -avz --delete node_modules/@bull-board/ui $host:~/$project_path/bull-board


# 输出同步完成
echo "同步完成"
