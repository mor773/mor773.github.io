import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from news_content import collect_news


class NewsCollectionTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / '_news').mkdir()
        (self.root / 'platform.json').write_text(json.dumps({'companies': [{'id': 'company-a'}]}))

    def write(self, name, text):
        (self.root / '_news' / name).write_text(text, encoding='utf-8')

    def test_auto_discovery_metadata_and_summary(self):
        self.write('2026-10-28-文章.md', '---\ntitle: 新文章\nauthor: 管理员\n---\n\n## 正文\n\n**自动摘要**，无需维护 JSON。')
        data = collect_news(self.root)
        self.assertEqual(data['errors'], [])
        self.assertEqual(data['articles'][0]['date'], '2026-10-28')
        self.assertEqual(data['articles'][0]['author'], '管理员')
        self.assertIn('自动摘要', data['articles'][0]['summary'])
        self.assertIn('**自动摘要**', data['articles'][0]['body'])
        self.write('2026-10-29-new.md', '---\ntitle: 后加入\n---\n后加入的文章')
        self.assertEqual(collect_news(self.root)['articles'][0]['title'], '后加入')

    def test_drafts_and_company(self):
        self.write('2026-10-28-draft.md', '---\ntitle: 草稿\ndraft: true\n---\n不发布')
        self.write('2026-10-28-company.md', '---\ntitle: 公司文章\ncompanyId: company-a\n---\n正文')
        data = collect_news(self.root)
        self.assertEqual(len(data['articles']), 1)
        self.assertEqual(data['articles'][0]['companyId'], 'company-a')

    def test_cover_image_metadata(self):
        self.write('2026-10-28-cover.md', '---\ntitle: 封面文章\nimage: assets/news/cover.png\n---\n正文')
        self.write('2026-10-28-no-cover.md', '---\ntitle: 无封面\n---\n正文')
        rows = {a['title']: a for a in collect_news(self.root)['articles']}
        self.assertEqual(rows['封面文章']['image'], 'assets/news/cover.png')
        self.assertEqual(rows['无封面']['image'], '')
        self.write('2026-10-28-invalid.md', '---\ntitle: 封面格式错误\nimage: [one, two]\n---\n正文')
        self.assertEqual(len(collect_news(self.root)['errors']), 1)

    def test_invalid_files_reported_without_losing_good_articles(self):
        self.write('2026-10-28-good.md', '---\ntitle: 正常文章\n---\n正文')
        self.write('bad.md', '缺少信息')
        self.write('2026-10-28-foreign.md', '---\ntitle: 不存在的公司\ncompanyId: missing\n---\n正文')
        data = collect_news(self.root)
        self.assertEqual(len(data['articles']), 1)
        self.assertEqual(len(data['errors']), 2)

    def test_safe_yaml_and_symlink_exclusion(self):
        self.write('unsafe.md', '---\ntitle: !!python/object:builtins.object {}\n---\n不解析对象')
        outside = self.root / '2026-10-28-outside.md'
        outside.write_text('---\ntitle: 目录之外\n---\n正文')
        (self.root / '_news' / outside.name).symlink_to(outside)
        data = collect_news(self.root)
        self.assertEqual(data['articles'], [])
        self.assertEqual(len(data['errors']), 1)


if __name__ == '__main__':
    unittest.main()
