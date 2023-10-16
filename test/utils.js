// Helper function to log all stub call arguments during debugging
export function logAllCallArguments(stub) {
  for (let i = 0; i < stub.callCount; i++) {
    const callArgs = stub.getCall(i).args;
    process.stdout.write(
      `Call ${i + 1} arguments: ${JSON.stringify(callArgs)}\n`
    );
  }
}
