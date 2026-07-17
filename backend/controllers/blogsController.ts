import { Request, Response } from 'express';
import db from '../config/db';
import { cacheService } from '../services/cacheService';
import { generateSitemap } from '../utils/sitemap';

// Fetch all blogs (public)
export const getBlogs = async (req: Request, res: Response) => {
  try {
    const cacheKey = 'blogs:all';
    const cachedBlogs = await cacheService.get<any[]>(cacheKey);
    if (cachedBlogs) {
      return res.json({ status: 'success', data: cachedBlogs });
    }

    db.all(`SELECT * FROM blog_posts ORDER BY created_at DESC`, [], (err, rows) => {
      if (err) {
        console.error('Failed to get blogs:', err);
        return res.status(500).json({ status: 'error', message: 'Database error' });
      }

      const parsedRows = (rows || []).map((r: any) => ({
        ...r,
        published: r.published === 1
      }));

      cacheService.set(cacheKey, parsedRows, 300).catch(console.error);
      res.json({ status: 'success', data: parsedRows });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// Fetch a single blog by slug (public)
export const getBlogBySlug = async (req: Request, res: Response) => {
  const { slug } = req.params;
  try {
    const cacheKey = `blogs:slug:${slug}`;
    const cachedBlog = await cacheService.get<any>(cacheKey);
    if (cachedBlog) {
      return res.json({ status: 'success', data: cachedBlog });
    }

    db.get(`SELECT * FROM blog_posts WHERE slug = ?`, [slug], (err, row: any) => {
      if (err) {
        console.error('Failed to get blog:', err);
        return res.status(500).json({ status: 'error', message: 'Database error' });
      }
      if (!row) {
        return res.status(404).json({ status: 'error', message: 'Blog post not found' });
      }

      const parsedRow = {
        ...row,
        published: row.published === 1
      };

      cacheService.set(cacheKey, parsedRow, 300).catch(console.error);
      res.json({ status: 'success', data: parsedRow });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// Create a new blog post (admin)
export const createBlog = (req: Request, res: Response) => {
  const { title, slug, summary, content, banner_image, author_name, published } = req.body;
  
  if (!title || !slug || !content) {
    return res.status(400).json({ status: 'error', message: 'Title, slug, and content are required' });
  }

  const id = 'post-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  const isPublished = published ? 1 : 0;

  db.run(
    `INSERT INTO blog_posts (id, title, slug, summary, content, banner_image, author_name, published)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, title, slug, summary || '', content, banner_image || '', author_name || 'Admin', isPublished
    ],
    function (err) {
      if (err) {
        console.error('Failed to create blog:', err);
        return res.status(500).json({ status: 'error', message: err.message || 'Database error' });
      }

      // Clear cache
      cacheService.delPattern('blogs:*').catch(console.error);

      res.json({
        status: 'success',
        message: 'Blog post created successfully',
        data: { id }
      });
      generateSitemap().catch(console.error);
    }
  );
};

// Update an existing blog post (admin)
export const updateBlog = (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, slug, summary, content, banner_image, author_name, published } = req.body;

  if (!title || !slug || !content) {
    return res.status(400).json({ status: 'error', message: 'Title, slug, and content are required' });
  }

  const isPublished = published ? 1 : 0;

  db.run(
    `UPDATE blog_posts 
     SET title = ?, slug = ?, summary = ?, content = ?, banner_image = ?, author_name = ?, published = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      title, slug, summary || '', content, banner_image || '', author_name || 'Admin', isPublished, id
    ],
    function (err) {
      if (err) {
        console.error('Failed to update blog:', err);
        return res.status(500).json({ status: 'error', message: 'Database error' });
      }

      // Clear cache
      cacheService.delPattern('blogs:*').catch(console.error);

      res.json({
        status: 'success',
        message: 'Blog post updated successfully'
      });
      generateSitemap().catch(console.error);
    }
  );
};

// Delete a blog post (admin)
export const deleteBlog = (req: Request, res: Response) => {
  const { id } = req.params;

  db.run(`DELETE FROM blog_posts WHERE id = ?`, [id], function (err) {
    if (err) {
      console.error('Failed to delete blog:', err);
      return res.status(500).json({ status: 'error', message: 'Database error' });
    }

    // Clear cache
    cacheService.delPattern('blogs:*').catch(console.error);

    res.json({
      status: 'success',
      message: 'Blog post deleted successfully'
    });
    generateSitemap().catch(console.error);
  });
};
