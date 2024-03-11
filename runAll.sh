#!/usr/bin/env bash

# Function to check if a command exists and then execute it
checkAndInvoke() {
  local command=$1
  local execName=$(echo $command | awk '{print $1}')

  echo "---------------------------------"
  if command -v $execName &> /dev/null; then
    echo "Running with $execName..."
    echo "---------------------------------"
    $command
  else
    echo "Command: $execName is not installed, skipping. prehaps (brew install $execName)"
  fi
}

ARGS="$@"
# Execute each command directly
checkAndInvoke "node main.mjs ${ARGS}"
checkAndInvoke "bun main.mjs ${ARGS}"
checkAndInvoke "deno run --allow-net main.mjs ${ARGS}"
