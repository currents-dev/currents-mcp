import { test, expect } from '@playwright/test';

test.describe('TodoMVC Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the TodoMVC app before each test
    await page.goto('/');
  });

  test('should not add empty todos', async ({ page }) => {
    // Try to add an empty todo
    await page.locator('.new-todo').fill('  ');
    await page.locator('.new-todo').press('Enter');
    
    // Verify no todo was added
    await expect(page.locator('.todo-list li')).toHaveCount(0);
  });

  test('should handle special characters in todos', async ({ page }) => {
    // Add a todo with special characters
    const specialTodo = '!@#$%^&*()_+<>?:"{|}'; 
    await page.locator('.new-todo').fill(specialTodo);
    await page.locator('.new-todo').press('Enter');
    
    // Verify the todo was added correctly
    await expect(page.locator('.todo-list li label')).toHaveText(specialTodo);
  });

  test('should handle very long todo text', async ({ page }) => {
    // Create a very long todo text
    const longText = 'This is a very long todo item that exceeds the typical length of a todo item and tests how the application handles long text inputs without breaking the layout or functionality of the application.';
    
    // Add the long todo
    await page.locator('.new-todo').fill(longText);
    await page.locator('.new-todo').press('Enter');
    
    // Verify the todo was added correctly
    await expect(page.locator('.todo-list li label')).toHaveText(longText);
  });

  test('should handle marking all todos as completed', async ({ page }) => {
    // Add multiple todos
    const todos = ['Task 1', 'Task 2', 'Task 3'];
    for (const todo of todos) {
      await page.locator('.new-todo').fill(todo);
      await page.locator('.new-todo').press('Enter');
    }
    
    // Verify all todos were added
    await expect(page.locator('.todo-list li')).toHaveCount(todos.length);
    
    // Toggle all todos to completed
    await page.locator('.toggle-all').click();
    
    // Verify all todos are marked as completed
    for (let i = 0; i < todos.length; i++) {
      await expect(page.locator('.todo-list li').nth(i)).toHaveClass(/completed/);
    }
    
    // Verify the completed count
    await expect(page.locator('.todo-count')).toContainText('0 items left');
  });

  test('should handle rapid toggling of todo status', async ({ page }) => {
    // Add a todo
    await page.locator('.new-todo').fill('Toggle me');
    await page.locator('.new-todo').press('Enter');
    
    // Toggle the todo status multiple times rapidly
    for (let i = 0; i < 5; i++) {
      await page.locator('.todo-list li .toggle').click();
    }
    
    // Verify the final state (should be completed since we toggled 5 times)
    await expect(page.locator('.todo-list li')).toHaveClass(/completed/);
  });

  test('should handle editing a todo', async ({ page }) => {
    // Add a todo
    await page.locator('.new-todo').fill('Edit me');
    await page.locator('.new-todo').press('Enter');
    
    // Double-click to edit
    await page.locator('.todo-list li label').dblclick();
    
    // Clear the input and type new text
    await page.locator('.todo-list li .edit').fill('');
    await page.locator('.todo-list li .edit').fill('Edited todo');
    await page.locator('.todo-list li .edit').press('Enter');
    
    // Verify the todo was edited
    await expect(page.locator('.todo-list li label')).toHaveText('Edited todo');
  });
});