import { describe, it, expect } from 'vitest';
import {
  generateBashZshWrapper,
  generatePowerShellWrapper,
  generateFullScript
} from './wrapper-templates.js';

describe('Alias wrapper generators', () => {
  it('should generate valid Zsh/Bash wrappers for claude', () => {
    const script = generateBashZshWrapper('claude');
    expect(script).toContain('claude() {');
    expect(script).toContain('caesar add "$4" --tool claude');
    expect(script).toContain('command -v claude');
    expect(script).toContain('command claude "$@"');
  });

  it('should generate valid Zsh/Bash wrappers for opencode', () => {
    const script = generateBashZshWrapper('opencode');
    expect(script).toContain('opencode() {');
    expect(script).toContain('caesar add "$3" --tool opencode');
    expect(script).toContain('caesar remove "$3"');
    expect(script).toContain('command opencode "$@"');
  });

  it('should generate valid PowerShell wrappers for claude', () => {
    const script = generatePowerShellWrapper('claude');
    expect(script).toContain('function claude {');
    expect(script).toContain('caesar add $args[3] --tool claude');
    expect(script).toContain('& $realBin @args');
  });

  it('should generate full script with markers', () => {
    const script = generateFullScript('bash');
    expect(script).toContain('# <<< CAESAR NATIVE-LIKE WRAPPER START >>>');
    expect(script).toContain('# <<< CAESAR NATIVE-LIKE WRAPPER END >>>');
    expect(script).toContain('claude()');
    expect(script).toContain('opencode()');
    expect(script).toContain('kiro()');
  });
});
