"""Collect blog-style Markdown from _news for local preview and static builds."""
from datetime import date, datetime
import json
from pathlib import Path
import re

import yaml


def collect_news(root):
    root = Path(root).resolve()
    folder = root / '_news'
    companies = {row['id'] for row in json.loads((root / 'platform.json').read_text())['companies']}
    articles, errors = [], []
    for path in sorted(folder.rglob('*.md')) if folder.exists() else []:
        if path.is_symlink() or not path.resolve().is_relative_to(folder.resolve()):
            continue
        relative = path.relative_to(folder).as_posix()
        try:
            raw = path.read_text(encoding='utf-8-sig').replace('\r\n', '\n')
            match = re.match(r'\A---\n(.*?)\n---(?:\n|$)(.*)\Z', raw, re.S)
            if not match:
                raise ValueError('文章开头需要 --- 包围的 YAML 信息')
            meta = yaml.safe_load(match[1])
            if not isinstance(meta, dict):
                raise ValueError('文章信息应为 YAML 对象')
            if meta.get('draft') is True:
                continue
            if not isinstance(meta.get('title'), str) or not meta['title'].strip():
                raise ValueError('请填写 title')
            published = meta.get('date', path.name[:10])
            if isinstance(published, datetime):
                published = published.date()
            if not isinstance(published, date):
                published = date.fromisoformat(str(published))
            company = meta.get('companyId', '') or ''
            if company and company not in companies:
                raise ValueError(f'companyId 不存在：{company}')
            body = match[2].strip()
            summary = meta.get('summary', '')
            if not summary:
                summary = re.sub(r'```.*?```', '', body, flags=re.S)
                summary = re.sub(r'!?\[([^\]]*)\]\([^)]*\)', r'\1', summary)
                summary = re.sub(r'[#*`>|_-]', '', summary)
                summary = re.sub(r'\s+', ' ', summary).strip()[:140]
            author = meta.get('author', '平台管理员')
            image = meta.get('image', '')
            if not isinstance(image, str):
                raise ValueError('image 应为图片路径文字')
            if not isinstance(summary, str) or not isinstance(author, str):
                raise ValueError('summary 和 author 应为文字')
            articles.append({'id': relative[:-3], 'title': meta['title'].strip(),
                             'date': published.isoformat(), 'author': author,
                             'summary': summary, 'companyId': company, 'image': image.strip(), 'body': body,
                             'source': '_news/' + relative})
        except (ValueError, OSError, yaml.YAMLError, TypeError) as error:
            errors.append(f'{relative}：{error}')
    articles.sort(key=lambda row: (row['date'], row['id']), reverse=True)
    return {'articles': articles, 'errors': errors}
