import os
from flask_migrate import migrate, upgrade
from app import create_app, db

app = create_app()


def auto_migrate():
    """自动检测模型变动并升级数据库"""
    with app.app_context():
        if not os.path.exists('migrations'):
            print("❌ 未找到 migrations 文件夹，请先运行 'flask db init'")
            return

        print("🔍 正在检测数据库模型变动...")

        # 使用时间戳作为迁移消息防止冲突
        import time
        migration_msg = f"auto_migration_{int(time.time())}"

        try:
            migrate(message=migration_msg)
        except Exception as e:
            print(f"⚠️ 生成迁移脚本提示: {e}")

        print("🚀 正在执行数据库升级...")
        try:
            upgrade()
            print("✅ 数据库已成功同步到最新版本！")
        except Exception as e:
            print(f"❌ 升级失败: {e}")


if __name__ == '__main__':
    auto_migrate()