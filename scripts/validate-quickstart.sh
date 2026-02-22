#!/usr/bin/env bash
# Quickstart Validation Script
# Tests all examples from quickstart.md to ensure they work

set -e

echo "🧪 Validating Quickstart Examples..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Ensure we're in project root
cd "$(dirname "$0")/.." || exit 1

# Helper function
run_test() {
  local test_name="$1"
  local test_command="$2"

  echo -n "Testing: $test_name... "

  if eval "$test_command" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}✗ FAIL${NC}"
    ((TESTS_FAILED++))
  fi
}

# Ensure build exists
echo "📦 Checking build..."
if [ ! -d "dist" ]; then
  echo -e "${YELLOW}⚠ Build not found, running npm run build...${NC}"
  npm run build
fi
echo ""

# Create test directory
TEST_DIR=".test-quickstart-$$"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

echo "🧪 Running Quickstart Validation Tests..."
echo ""

# Test 1: Init command
run_test "sparn init" "../dist/cli/index.js init --force"

# Test 2: Config file created
run_test "config.yaml created" "test -f .sparn/config.yaml"

# Test 3: Database created
run_test "memory.db created" "test -f .sparn/memory.db"

# Test 4: Config get
run_test "sparn config get" "../dist/cli/index.js config get pruning.threshold"

# Test 5: Config set
run_test "sparn config set" "../dist/cli/index.js config set pruning.threshold 10"

# Test 6: Create sample context
echo "Sample context line 1
Sample context line 2
Error: Test error message
Sample context line 3
Sample context line 4" > test-context.txt

# Test 7: Optimize from file
run_test "sparn optimize --input" "../dist/cli/index.js optimize --input test-context.txt --output optimized.txt"

# Test 8: Optimized output created
run_test "optimized output created" "test -f optimized.txt"

# Test 9: Optimize from stdin
run_test "sparn optimize (stdin)" "cat test-context.txt | ../dist/cli/index.js optimize > optimized-stdin.txt"

# Test 10: Stats command
run_test "sparn stats" "../dist/cli/index.js stats"

# Test 11: Stats with JSON
run_test "sparn stats --json" "../dist/cli/index.js stats --json"

# Test 12: Consolidate command
run_test "sparn consolidate" "../dist/cli/index.js consolidate"

# Test 13: Relay command
run_test "sparn relay echo" "../dist/cli/index.js relay echo 'test'"

# Test 14: Help flag
run_test "sparn --help" "../dist/cli/index.js --help"

# Test 15: Version flag
run_test "sparn --version" "../dist/cli/index.js --version"

# Cleanup
cd ..
rm -rf "$TEST_DIR"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Quickstart Validation Results"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✨ All tests passed! Quickstart is valid.${NC}"
  exit 0
else
  echo -e "${RED}⚠ Some tests failed. Check the output above.${NC}"
  exit 1
fi
