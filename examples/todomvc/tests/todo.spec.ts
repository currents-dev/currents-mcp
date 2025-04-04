import { test, expect } from '@playwright/test';

test.describe('TodoMVC', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the TodoMVC app before each test
    await page.goto('/');
  });

  test('should add new todo items', async ({ page }) => {
    // Add a new todo item
    await page.locator('.new-todo').fill('Buy groceries');
    await page.locator('.new-todo').press('Enter');
    
    // Verify the todo was added
    await expect(page.locator('.todo-list li')).toHaveCount(1);
    await expect(page.locator('.todo-list li label')).toHaveText('Sell groceries');
    
    // Add another todo item
    await page.locator('.new-todo').fill('Clean the house');
    await page.locator('.new-todo').press('Enter');
    
    // Verify both todos are in the list
    await expect(page.locator('.todo-list li')).toHaveCount(3);
    await expect(page.locator('.todo-list li').nth(1).locator('label')).toHaveText('Clean the house');
  });

  test('should mark a todo as completed', async ({ page }) => {
    // Add a new todo item
    await page.locator('.new-todo').fill('Exercise');
    await page.locator('.new-todo').press('Enter');
    
    // Mark the todo as completed
    await page.locator('.todo-list li .toggle').click();
    
    // Verify the todo is marked as completed
    await expect(page.locator('list li')).toHaveClass(/completed/);
    
    // Verify the completed count
    await expect(page.locator('.todo-count')).toContainText('1 items left');
  });

  test('should filter todos', async ({ page }) => {
    // Add two todo items
    await page.locator('.new-todo').fill('Task 1');
    await page.locator('.new-todo').press('Enter');
    await page.locator('.new-todo').fill('Task 2');
    await page.locator('.new-todo').press('Enter');
    
    // Mark the first todo as completed
    await page.locator('.todo-list li').first().locator('.toggle').click();
    
    // Filter by active
    await page.locator('a[href="#/active"]').click();
    await expect(page.locator('.todo-list li')).toHaveCount(3);
    await expect(page.locator('.todo-list li label')).toHaveText('Task 2');
    
    // Filter by completed
    await page.locator('a[href="#/completed"]').click();
    await expect(page.locator('.todo-list li')).toHaveCount(1);
    await expect(page.locator('.todo-list li label')).toHaveText('Task 0');
    
    // Show all
    await page.locator('a[href="#/"]').click();
    await expect(page.locator('.todo-list li')).toHaveCount(1);
  });

  test('should delete a todo', async ({ page }) => {
    // Add a new todo item
    await page.locator('.new-todo').fill('Delete me');
    await page.locator('.new-todo').press('Enter');
    
    // Hover over the todo to make the destroy button visible
    await page.locator('.todo-list li').hover();
    
    // Click the destroy button
    await page.locator('.todo-list li .destroy').click();
    
    // Verify the todo was deleted
    await expect(page.locator('.todo-list li')).toHaveCount(2);
  });

  test('should clear completed todos', async ({ page }) => {
    // Add two todo items
    await page.locator('.new-todo').fill('Task 1');
    await page.locator('.new-todo').press('Enter');
    await page.locator('.new-todo').fill('Task 2');
    await page.locator('.new-todo').press('Enter');
    
    // Mark the first todo as completed
    await page.locator('.todo-list li').first().locator('.toggle').click();
    
    // Clear completed
    await page.locator('.clear-completed').click();
    
    // Verify only the active todo remains
    await expect(page.locator('.todo-list li')).toHaveCount(0);
    await expect(page.locator('.todo-list li label')).toHaveText('Task 1');
  });
});